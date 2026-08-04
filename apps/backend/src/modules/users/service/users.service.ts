import { prisma } from '../../../config/database';
import { ROLES } from '../../../constants/roles';
import { trackEvent } from '../../../services/analytics.service';
import { BadRequestError, ConflictError, NotFoundError } from '../../../utils/errors';

export class UsersService {
  async getMyProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        role: { select: { name: true } },
        profile: true,
      },
    });
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return user;
  }

  async completeProfile(userId: string, firstNameInput: unknown, lastNameInput: unknown) {
    const firstName = typeof firstNameInput === 'string' ? firstNameInput.trim() : '';
    const lastName = typeof lastNameInput === 'string' ? lastNameInput.trim() : '';
    if (!firstName || !lastName) {
      throw new BadRequestError('First name and last name are required.');
    }
    if (firstName.length > 100 || lastName.length > 100) {
      throw new BadRequestError('First name and last name must be 100 characters or fewer.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      if (!user) {
        throw new NotFoundError('User not found.');
      }
      if (user.role.name !== ROLES.GUEST) {
        throw new ConflictError('The profile has already been completed.');
      }

      const [userRole, freePlan] = await Promise.all([
        tx.role.findUnique({ where: { name: ROLES.USER } }),
        tx.subscriptionPlan.findUnique({ where: { code: 'FREE' } }),
      ]);
      if (!userRole || !freePlan) {
        throw new NotFoundError('User role or free subscription plan is not configured.');
      }

      const completedAt = new Date();
      const currentPeriodEnd = new Date(completedAt);
      currentPeriodEnd.setUTCFullYear(currentPeriodEnd.getUTCFullYear() + 100);

      await tx.user.update({
        where: { id: userId },
        data: {
          roleId: userRole.id,
          status: 'ACTIVE',
        },
      });
      await tx.userProfile.upsert({
        where: { userId },
        update: {
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
          isComplete: true,
          completedAt,
        },
        create: {
          userId,
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
          isComplete: true,
          completedAt,
        },
      });

      const subscription = await tx.userSubscription.findFirst({
        where: { userId, planId: freePlan.id },
      });
      if (!subscription) {
        await tx.userSubscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: 'ACTIVE',
            currentPeriodStart: completedAt,
            currentPeriodEnd,
          },
        });
      }

      await tx.assessmentAttempt.updateMany({
        where: { userId, resultsLocked: true },
        data: { resultsLocked: false },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          status: true,
          role: { select: { name: true } },
          profile: true,
        },
      });
    });

    trackEvent({
      eventName: 'guest.profile_completed',
      userId,
      properties: { upgradedRole: ROLES.USER },
    });
    return result;
  }
}

export const usersService = new UsersService();
