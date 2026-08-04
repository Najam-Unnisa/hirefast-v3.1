import type { Prisma, XpSourceType } from '@prisma/client';
import { prisma } from '../config/database';
import { trackEvent } from './analytics.service';
import { NotFoundError } from '../utils/errors';

type Tx = Prisma.TransactionClient;

export class GamificationService {
  async ensureUserGamification(userId: string, tx: Tx | typeof prisma = prisma) {
    const existing = await tx.userGamification.findUnique({
      where: { userId },
      include: { level: true },
    });
    if (existing) return existing;

    const level1 = await tx.level.findUnique({ where: { levelNumber: 1 } });
    if (!level1) {
      throw new NotFoundError('Gamification levels are not configured.');
    }

    return tx.userGamification.create({
      data: {
        userId,
        levelId: level1.id,
        totalXp: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
      include: { level: true },
    });
  }

  async getSummary(userId: string) {
    const gamification = await this.ensureUserGamification(userId);
    const badgesEarned = await prisma.userBadge.count({ where: { userId } });
    const nextLevel = await prisma.level.findFirst({
      where: { levelNumber: gamification.level.levelNumber + 1 },
    });

    return {
      totalXp: gamification.totalXp,
      level: {
        levelNumber: gamification.level.levelNumber,
        name: gamification.level.name,
        minXp: gamification.level.minXp,
        maxXp: gamification.level.maxXp,
      },
      nextLevel: nextLevel
        ? {
            levelNumber: nextLevel.levelNumber,
            name: nextLevel.name,
            minXp: nextLevel.minXp,
            xpRemaining: Math.max(0, nextLevel.minXp - gamification.totalXp),
          }
        : null,
      currentStreak: gamification.currentStreak,
      longestStreak: gamification.longestStreak,
      lastActivityAt: gamification.lastActivityAt,
      badgesEarned,
    };
  }

  async listXpTransactions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.xpTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.xpTransaction.count({ where: { userId } }),
    ]);
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async listEarnedBadges(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
  }

  async listBadgeCatalog() {
    return prisma.badge.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async listLevels() {
    return prisma.level.findMany({ orderBy: { levelNumber: 'asc' } });
  }

  async getStreak(userId: string) {
    const gamification = await this.ensureUserGamification(userId);
    return {
      currentStreak: gamification.currentStreak,
      longestStreak: gamification.longestStreak,
      lastActivityAt: gamification.lastActivityAt,
    };
  }

  /**
   * Awards XP from a configured rule (or explicit amount) and recalculates level.
   */
  async awardXp(input: {
    userId: string;
    eventKey: string;
    sourceType: XpSourceType;
    amount?: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    tx?: Tx;
  }) {
    const run = async (tx: Tx) => {
      const rule = await tx.xpRule.findUnique({ where: { eventKey: input.eventKey } });
      const amount = input.amount ?? rule?.xpAmount ?? 0;
      if (amount <= 0 && input.sourceType !== 'BADGE_UNLOCK') {
        return null;
      }

      const gamification = await this.ensureUserGamification(input.userId, tx);
      const balanceAfter = gamification.totalXp + Math.max(0, amount);
      const previousLevel = gamification.level.levelNumber;

      const level = await tx.level.findFirst({
        where: {
          minXp: { lte: balanceAfter },
          OR: [{ maxXp: null }, { maxXp: { gte: balanceAfter } }],
        },
        orderBy: { levelNumber: 'desc' },
      });

      await tx.userGamification.update({
        where: { userId: input.userId },
        data: {
          totalXp: balanceAfter,
          ...(level ? { levelId: level.id } : {}),
        },
      });

      const transaction =
        amount > 0
          ? await tx.xpTransaction.create({
              data: {
                userId: input.userId,
                sourceType: input.sourceType,
                eventKey: input.eventKey,
                amount,
                balanceAfter,
                referenceType: input.referenceType,
                referenceId: input.referenceId,
                description: input.description ?? rule?.description,
              },
            })
          : null;

      if (level && level.levelNumber > previousLevel) {
        trackEvent({
          eventName: 'gamification.level_up',
          userId: input.userId,
          properties: {
            fromLevel: previousLevel,
            toLevel: level.levelNumber,
            totalXp: balanceAfter,
          },
        });
      }

      return { transaction, totalXp: balanceAfter, level };
    };

    if (input.tx) {
      return run(input.tx);
    }
    return prisma.$transaction((tx) => run(tx));
  }

  async awardBadge(userId: string, badgeCode: string, tx?: Tx) {
    const run = async (client: Tx) => {
      const badge = await client.badge.findUnique({ where: { code: badgeCode } });
      if (!badge || !badge.isActive) return null;

      const existing = await client.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      });
      if (existing) return existing;

      const earned = await client.userBadge.create({
        data: { userId, badgeId: badge.id },
        include: { badge: true },
      });

      if (badge.xpReward > 0) {
        await this.awardXp({
          userId,
          eventKey: 'badge.unlocked',
          sourceType: 'BADGE_UNLOCK',
          amount: badge.xpReward,
          referenceType: 'badge',
          referenceId: badge.id,
          description: `Badge unlocked: ${badge.name}`,
          tx: client,
        });
      }

      trackEvent({
        eventName: 'gamification.badge_earned',
        userId,
        properties: { badgeCode: badge.code, badgeName: badge.name },
      });

      return earned;
    };

    if (tx) return run(tx);
    return prisma.$transaction((client) => run(client));
  }

  /** Updates daily streak and awards streak XP when the day advances. */
  async recordDailyActivity(userId: string) {
    return prisma.$transaction(async (tx) => {
      const gamification = await this.ensureUserGamification(userId, tx);
      const now = new Date();
      const last = gamification.lastActivityAt;

      let currentStreak = gamification.currentStreak;
      let awardedStreakXp = false;

      if (!last) {
        currentStreak = 1;
        awardedStreakXp = true;
      } else {
        const lastDay = utcDay(last);
        const today = utcDay(now);
        const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / 86_400_000);
        if (diffDays === 0) {
          return {
            currentStreak: gamification.currentStreak,
            longestStreak: gamification.longestStreak,
            lastActivityAt: gamification.lastActivityAt,
            awardedStreakXp: false,
          };
        }
        if (diffDays === 1) {
          currentStreak = gamification.currentStreak + 1;
          awardedStreakXp = true;
        } else {
          currentStreak = 1;
          awardedStreakXp = true;
        }
      }

      const longestStreak = Math.max(gamification.longestStreak, currentStreak);
      const updated = await tx.userGamification.update({
        where: { userId },
        data: {
          currentStreak,
          longestStreak,
          lastActivityAt: now,
        },
      });

      if (awardedStreakXp) {
        await this.awardXp({
          userId,
          eventKey: 'streak.daily',
          sourceType: 'DAILY_STREAK',
          referenceType: 'streak',
          description: 'Daily streak maintained',
          tx,
        });
        trackEvent({
          eventName: 'gamification.daily_streak_updated',
          userId,
          properties: { currentStreak, longestStreak },
        });
      }

      if (currentStreak >= 3) {
        await this.awardBadge(userId, 'STREAK_3', tx);
      }
      if (currentStreak >= 7) {
        await this.awardBadge(userId, 'STREAK_7', tx);
      }

      return {
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
        lastActivityAt: updated.lastActivityAt,
        awardedStreakXp,
      };
    });
  }

  async onProfileCompleted(userId: string) {
    await this.ensureUserGamification(userId);
    await this.recordDailyActivity(userId);
    await this.awardBadge(userId, 'PROFILE_COMPLETE');
  }

  async onAssessmentCompleted(
    userId: string,
    attemptId: string,
    assessmentCode: string,
    accessTier: 'FREE' | 'PREMIUM' | string = 'FREE',
  ) {
    const existingXp = await prisma.xpTransaction.findFirst({
      where: {
        userId,
        referenceType: 'assessment_attempt',
        referenceId: attemptId,
        sourceType: 'ASSESSMENT_COMPLETE',
      },
    });
    if (existingXp) {
      return;
    }

    await this.ensureUserGamification(userId);
    await this.recordDailyActivity(userId);
    const isPremiumAssessment = accessTier === 'PREMIUM';
    await this.awardXp({
      userId,
      eventKey: isPremiumAssessment ? 'premium.assessment.completed' : 'assessment.completed',
      sourceType: 'ASSESSMENT_COMPLETE',
      amount: isPremiumAssessment ? 150 : undefined,
      referenceType: 'assessment_attempt',
      referenceId: attemptId,
      description: isPremiumAssessment ? 'Premium assessment completed' : 'Assessment completed',
    });
    await this.awardBadge(userId, 'FIRST_ASSESSMENT');
    if (assessmentCode === 'GENERAL_COMMUNICATION') {
      await this.awardBadge(userId, 'COMMUNICATION_READY');
    }
    if (isPremiumAssessment) {
      await this.awardBadge(userId, 'PREMIUM_ASSESSMENT');
    }
  }
}

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const gamificationService = new GamificationService();
