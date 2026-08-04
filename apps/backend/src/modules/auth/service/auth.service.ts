import { randomBytes, randomUUID } from 'crypto';
import type { UserRoleValue } from '@hirefast/shared-types';
import { prisma } from '../../../config/database';
import { env } from '../../../config/env';
import { redisService } from '../../../config/redis';
import { ROLES } from '../../../constants/roles';
import { refreshTokenStore } from '../../../infrastructure/auth/refresh-token.store';
import { authProviderService } from '../../../providers/auth';
import { trackEvent } from '../../../services/analytics.service';
import { writeAuditLog } from '../../../services/audit.service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../../utils/errors';
import { createAuthTokens } from '../../../utils/jwt';

const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const OAUTH_STATE_PREFIX = 'auth:google:state:';

type UserWithIdentityData = {
  id: string;
  email: string;
  role: { name: string };
  profile: {
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    isComplete: boolean;
  } | null;
};

export interface AuthTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

function asRole(role: string): UserRoleValue {
  if (role !== ROLES.ADMIN && role !== ROLES.USER && role !== ROLES.GUEST) {
    throw new UnauthorizedError('The account has an invalid role.');
  }
  return role;
}

export class AuthService {
  async startGoogleAuth(
    portal: 'candidate' | 'admin' = 'candidate',
  ): Promise<{ authorizationUrl: string; state: string }> {
    const provider = authProviderService.requireReady();
    const state = randomBytes(32).toString('base64url');
    const portalValue = portal === 'admin' ? 'admin' : 'candidate';
    await redisService.set(`${OAUTH_STATE_PREFIX}${state}`, portalValue, OAUTH_STATE_TTL_SECONDS);

    return {
      authorizationUrl: provider.buildAuthorizationUrl({ state }),
      state,
    };
  }

  async handleGoogleCallback(
    code: string | undefined,
    state: string | undefined,
  ): Promise<{ tokens: AuthTokenResult; portal: 'candidate' | 'admin' }> {
    if (!code || !state) {
      throw new BadRequestError('Google authorization code and state are required.');
    }

    const stateKey = `${OAUTH_STATE_PREFIX}${state}`;
    const portalRaw = await redisService.get(stateKey);
    if (!portalRaw) {
      throw new UnauthorizedError('OAuth state is invalid or expired.');
    }
    await redisService.del(stateKey);
    const portal: 'candidate' | 'admin' = portalRaw === 'admin' ? 'admin' : 'candidate';

    const provider = authProviderService.requireReady();
    const providerTokens = await provider.exchangeAuthorizationCode(code);
    const googleProfile = await provider.fetchUserProfile(providerTokens.accessToken);
    const email = googleProfile.email.trim().toLowerCase();

    const user = await prisma.$transaction(async (tx) => {
      const existingIdentity = await tx.authIdentity.findUnique({
        where: {
          provider_providerSubject: {
            provider: 'GOOGLE',
            providerSubject: googleProfile.providerSubject,
          },
        },
        include: {
          user: {
            include: {
              role: true,
              profile: true,
            },
          },
        },
      });

      if (existingIdentity) {
        await tx.authIdentity.update({
          where: { id: existingIdentity.id },
          data: { email },
        });
        return tx.user.update({
          where: { id: existingIdentity.userId },
          data: {
            emailVerified: googleProfile.emailVerified,
            lastLoginAt: new Date(),
          },
          include: { role: true, profile: true },
        });
      }

      const existingUser = await tx.user.findUnique({
        where: { email },
        include: { role: true, profile: true },
      });

      if (existingUser) {
        await tx.authIdentity.create({
          data: {
            userId: existingUser.id,
            provider: 'GOOGLE',
            providerSubject: googleProfile.providerSubject,
            email,
          },
        });
        await tx.notificationPreference.upsert({
          where: { userId: existingUser.id },
          update: {},
          create: { userId: existingUser.id },
        });
        return tx.user.update({
          where: { id: existingUser.id },
          data: {
            emailVerified: googleProfile.emailVerified,
            lastLoginAt: new Date(),
          },
          include: { role: true, profile: true },
        });
      }

      const guestRole = await tx.role.findUnique({ where: { name: ROLES.GUEST } });
      if (!guestRole) {
        throw new NotFoundError('Guest role is not configured.');
      }

      const created = await tx.user.create({
        data: {
          email,
          roleId: guestRole.id,
          status: 'PENDING_REGISTRATION',
          emailVerified: googleProfile.emailVerified,
          lastLoginAt: new Date(),
          identities: {
            create: {
              provider: 'GOOGLE',
              providerSubject: googleProfile.providerSubject,
              email,
            },
          },
          profile: {
            create: {
              firstName: googleProfile.givenName,
              lastName: googleProfile.familyName,
              displayName: googleProfile.name,
              isComplete: false,
            },
          },
          notificationPreference: { create: {} },
        },
        include: { role: true, profile: true },
      });
      trackEvent({
        eventName: 'guest.account_created',
        userId: created.id,
        properties: { provider: 'GOOGLE' },
      });
      return created;
    });

    if (portal === 'admin' && user.role.name !== ROLES.ADMIN) {
      throw new UnauthorizedError('This portal is restricted to administrators.');
    }

    trackEvent({
      eventName: portal === 'admin' ? 'admin.login' : 'auth.google_login',
      userId: user.id,
      properties: { role: user.role.name, portal, method: 'google' },
    });
    return { tokens: await this.issueSession(user), portal };
  }

  async devGuestLogin(emailInput: string | undefined): Promise<AuthTokenResult> {
    if (env.isProduction) {
      throw new NotFoundError('Route not found.');
    }

    const email = emailInput?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestError('A valid email is required.');
    }

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email },
        include: { role: true, profile: true },
      });
      if (existing) {
        if (existing.role.name !== ROLES.GUEST) {
          throw new ConflictError('That email belongs to a registered account.');
        }
        await tx.notificationPreference.upsert({
          where: { userId: existing.id },
          update: {},
          create: { userId: existing.id },
        });
        return tx.user.update({
          where: { id: existing.id },
          data: { lastLoginAt: new Date() },
          include: { role: true, profile: true },
        });
      }

      const guestRole = await tx.role.findUnique({ where: { name: ROLES.GUEST } });
      if (!guestRole) {
        throw new NotFoundError('Guest role is not configured.');
      }

      return tx.user.create({
        data: {
          email,
          roleId: guestRole.id,
          status: 'PENDING_REGISTRATION',
          emailVerified: true,
          lastLoginAt: new Date(),
          profile: { create: { isComplete: false } },
          notificationPreference: { create: {} },
        },
        include: { role: true, profile: true },
      });
    });

    trackEvent({ eventName: 'auth.dev_guest_login', userId: user.id });
    return this.issueSession(user);
  }

  /** Non-production helper: sign in as the seeded ADMIN user. */
  async devAdminLogin(emailInput: string | undefined): Promise<AuthTokenResult> {
    if (env.isProduction) {
      throw new NotFoundError('Route not found.');
    }

    const email = (
      emailInput?.trim().toLowerCase() ||
      process.env.SEED_ADMIN_EMAIL ||
      'admin@hirefast.local'
    ).toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, profile: true },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundError('Admin user is not seeded.');
    }
    if (user.role.name !== ROLES.ADMIN) {
      throw new ForbiddenError('That account is not an administrator.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    trackEvent({ eventName: 'admin.login', userId: user.id, properties: { method: 'dev' } });
    await writeAuditLog({
      actorId: user.id,
      action: 'LOGIN',
      resourceType: 'session',
      resourceId: user.id,
      message: `Admin login (${email})`,
    });
    return this.issueSession(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthTokenResult> {
    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required.');
    }

    const record = await refreshTokenStore.find(refreshToken);
    if (!record) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      include: { role: true, profile: true },
    });
    if (!user || user.deletedAt) {
      await refreshTokenStore.revoke(refreshToken);
      throw new UnauthorizedError('The account is no longer available.');
    }

    const role = asRole(user.role.name);
    const nextRefreshToken = await refreshTokenStore.rotate(refreshToken, {
      userId: user.id,
      email: user.email,
      role,
      familyId: record.familyId,
    });
    if (!nextRefreshToken) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    const signed = createAuthTokens({ sub: user.id, email: user.email, role });
    return {
      accessToken: signed.accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: signed.expiresIn,
    };
  }

  async logout(refreshToken: string | undefined): Promise<{ loggedOut: true }> {
    if (refreshToken) {
      await refreshTokenStore.revoke(refreshToken);
    }
    return { loggedOut: true };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        emailVerified: true,
        role: { select: { name: true } },
        profile: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            isComplete: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const { getActiveSubscription } = await import('../../../services/subscription-access.service');
    const subscription = await getActiveSubscription(userId);

    return {
      ...user,
      subscription: subscription
        ? { planCode: subscription.planCode, status: subscription.status }
        : null,
    };
  }

  async getSession(userId: string): Promise<{ authenticated: true; user: UserWithIdentityData }> {
    return { authenticated: true, user: await this.getMe(userId) };
  }

  private async issueSession(user: {
    id: string;
    email: string;
    role: { name: string };
  }): Promise<AuthTokenResult> {
    const role = asRole(user.role.name);
    const signed = createAuthTokens({
      sub: user.id,
      email: user.email,
      role,
    });
    const opaqueRefreshToken = refreshTokenStore.issueToken();
    await refreshTokenStore.save(opaqueRefreshToken, {
      userId: user.id,
      email: user.email,
      role,
      familyId: randomUUID(),
    });
    return {
      accessToken: signed.accessToken,
      refreshToken: opaqueRefreshToken,
      expiresIn: signed.expiresIn,
    };
  }
}

export const authService = new AuthService();
