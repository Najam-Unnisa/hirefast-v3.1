import { prisma } from '../../../config/database';
import { PLAN_CODES, PLAN_FEATURES } from '../../../constants/subscription';
import { env } from '../../../config/env';
import { trackEvent } from '../../../services/analytics.service';
import { gamificationService } from '../../../services/gamification.service';
import {
  getActiveSubscription,
  userHasFeature,
} from '../../../services/subscription-access.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../utils/errors';

export class SubscriptionsService {
  async listPlans() {
    return prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      include: { features: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getMySubscription(userId: string) {
    const snapshot = await getActiveSubscription(userId);
    const latest = await prisma.userSubscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: { include: { features: true } } },
    });

    if (snapshot) {
      return {
        subscriptionId: snapshot.subscriptionId,
        planCode: snapshot.planCode,
        status: snapshot.status,
        currentPeriodEnd: snapshot.currentPeriodEnd,
        features: snapshot.featureKeys,
        isPremium: snapshot.planCode === PLAN_CODES.PREMIUM,
        isExpired: false,
      };
    }

    if (latest) {
      const isExpired =
        latest.currentPeriodEnd <= new Date() ||
        ['EXPIRED', 'CANCELED', 'PAST_DUE'].includes(latest.status);
      return {
        subscriptionId: latest.id,
        planCode: latest.plan.code,
        status: isExpired && latest.status === 'ACTIVE' ? 'EXPIRED' : latest.status,
        currentPeriodEnd: latest.currentPeriodEnd,
        features: [],
        isPremium: false,
        isExpired,
        message: isExpired
          ? 'Your Premium subscription is no longer active. Freemium access remains available after downgrade.'
          : 'No active subscription features are currently entitled.',
      };
    }

    return {
      planCode: null,
      status: 'NONE',
      features: [] as string[],
      isPremium: false,
      isExpired: false,
    };
  }

  async getMyFeatures(userId: string) {
    const snapshot = await getActiveSubscription(userId);
    return {
      planCode: snapshot?.planCode ?? null,
      features: snapshot?.featureKeys ?? [],
      isPremium: snapshot?.planCode === PLAN_CODES.PREMIUM,
    };
  }

  async validateFeature(userId: string, featureKey: unknown) {
    if (typeof featureKey !== 'string' || !featureKey.trim()) {
      throw new BadRequestError('featureKey is required.');
    }
    const allowed = await userHasFeature(userId, featureKey.trim());
    if (!allowed) {
      throw new ForbiddenError(`Subscription feature required: ${featureKey}.`, [
        {
          message: `Required feature: ${featureKey}`,
          code: 'SUBSCRIPTION_REQUIRED',
        },
      ]);
    }
    return { featureKey: featureKey.trim(), entitled: true as const };
  }

  /**
   * Activates Premium for the current user (non-production only).
   * Production must use billing checkout / webhooks — never self-serve entitlement grants.
   */
  async activatePremium(userId: string) {
    if (env.isProduction) {
      throw new NotFoundError('Route not found.');
    }

    const premiumPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: PLAN_CODES.PREMIUM },
      include: { features: true },
    });
    if (!premiumPlan) {
      throw new NotFoundError('Premium plan is not configured.');
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

    const result = await prisma.$transaction(async (tx) => {
      await tx.userSubscription.updateMany({
        where: {
          userId,
          status: { in: ['ACTIVE', 'TRIALING'] },
          plan: { code: PLAN_CODES.FREE },
        },
        data: {
          status: 'CANCELED',
          canceledAt: now,
        },
      });

      const existingPremium = await tx.userSubscription.findFirst({
        where: { userId, planId: premiumPlan.id },
        orderBy: { createdAt: 'desc' },
      });

      if (existingPremium) {
        return tx.userSubscription.update({
          where: { id: existingPremium.id },
          data: {
            status: 'ACTIVE',
            startedAt: existingPremium.startedAt ?? now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            canceledAt: null,
          },
          include: { plan: { include: { features: true } } },
        });
      }

      return tx.userSubscription.create({
        data: {
          userId,
          planId: premiumPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: { include: { features: true } } },
      });
    });

    await gamificationService.awardBadge(userId, 'PREMIUM_MEMBER').catch(() => undefined);
    trackEvent({
      eventName: 'premium.activated',
      userId,
      properties: { subscriptionId: result.id, planCode: PLAN_CODES.PREMIUM },
    });

    return {
      subscriptionId: result.id,
      planCode: result.plan.code,
      status: result.status,
      currentPeriodEnd: result.currentPeriodEnd,
      features: result.plan.features.map((feature) => feature.featureKey),
      isPremium: true,
    };
  }

  /** Returns the user to an active FREE plan (subscription downgrade / expiry recovery). */
  async downgradeToFree(userId: string) {
    const freePlan = await prisma.subscriptionPlan.findUnique({
      where: { code: PLAN_CODES.FREE },
    });
    if (!freePlan) {
      throw new NotFoundError('Free plan is not configured.');
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 100);

    await prisma.$transaction(async (tx) => {
      await tx.userSubscription.updateMany({
        where: {
          userId,
          status: { in: ['ACTIVE', 'TRIALING'] },
          plan: { code: PLAN_CODES.PREMIUM },
        },
        data: {
          status: 'CANCELED',
          canceledAt: now,
          currentPeriodEnd: now,
        },
      });

      const freeSub = await tx.userSubscription.findFirst({
        where: { userId, planId: freePlan.id },
        orderBy: { createdAt: 'desc' },
      });

      if (freeSub) {
        await tx.userSubscription.update({
          where: { id: freeSub.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            canceledAt: null,
          },
        });
      } else {
        await tx.userSubscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }
    });

    trackEvent({
      eventName: 'premium.downgraded',
      userId,
      properties: { planCode: PLAN_CODES.FREE },
    });

    return this.getMySubscription(userId);
  }

  /** Development helper to force-expire Premium for edge-case testing. */
  async expirePremiumForTesting(userId: string) {
    if (env.isProduction) {
      throw new NotFoundError('Route not found.');
    }

    const now = new Date();
    const updated = await prisma.userSubscription.updateMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
        plan: { code: PLAN_CODES.PREMIUM },
      },
      data: {
        status: 'EXPIRED',
        currentPeriodEnd: now,
        canceledAt: now,
      },
    });

    if (updated.count === 0) {
      throw new BadRequestError('No active Premium subscription to expire.');
    }

    await this.downgradeToFree(userId);
    return this.getMySubscription(userId);
  }

  async listPremiumAssessments(userId: string) {
    const entitled = await userHasFeature(userId, PLAN_FEATURES.ASSESSMENTS_PREMIUM);
    if (!entitled) {
      throw new ForbiddenError('Premium subscription required.', [
        {
          code: 'PREMIUM_REQUIRED',
          message: 'An active Premium subscription is required for this resource.',
        },
      ]);
    }

    return prisma.assessment.findMany({
      where: {
        status: 'PUBLISHED',
        accessTier: 'PREMIUM',
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        slug: true,
        title: true,
        description: true,
        instructions: true,
        accessTier: true,
        durationMinutes: true,
        category: { select: { code: true, name: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });
  }
}

export const subscriptionsService = new SubscriptionsService();
