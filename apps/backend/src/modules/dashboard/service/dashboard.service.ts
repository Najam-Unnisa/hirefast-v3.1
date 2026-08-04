import { prisma } from '../../../config/database';
import { PLAN_FEATURES } from '../../../constants/subscription';
import { getActiveSubscription } from '../../../services/subscription-access.service';
import { gamificationService } from '../../../services/gamification.service';
import { NotFoundError } from '../../../utils/errors';

export class DashboardService {
  async getDashboard(userId: string) {
    const [
      user,
      subscription,
      latestJrs,
      attemptStats,
      latestAttempt,
      availableFree,
      gamification,
      availablePremium,
      jrsHistory,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          profile: {
            select: {
              isComplete: true,
              displayName: true,
              firstName: true,
              headline: true,
            },
          },
        },
      }),
      getActiveSubscription(userId),
      prisma.jobReadinessScore.findFirst({
        where: { userId },
        orderBy: { calculatedAt: 'desc' },
        include: {
          skillScores: {
            include: { skill: { select: { id: true, code: true, name: true } } },
            orderBy: { score: 'desc' },
          },
        },
      }),
      prisma.assessmentAttempt.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
      prisma.assessmentAttempt.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          assessment: { select: { id: true, title: true, slug: true, code: true } },
          aiEvaluation: { select: { summary: true, status: true } },
        },
      }),
      prisma.assessment.count({
        where: {
          status: 'PUBLISHED',
          accessTier: 'FREE',
          isActive: true,
          deletedAt: null,
        },
      }),
      gamificationService.getSummary(userId),
      prisma.assessment.count({
        where: {
          status: 'PUBLISHED',
          accessTier: 'PREMIUM',
          isActive: true,
          deletedAt: null,
        },
      }),
      prisma.jobReadinessScore.findMany({
        where: { userId },
        orderBy: { calculatedAt: 'asc' },
        take: 12,
        select: {
          overallScore: true,
          band: true,
          calculatedAt: true,
          attempt: { select: { assessment: { select: { title: true } } } },
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isPremium = Boolean(
      subscription?.featureKeys.includes(PLAN_FEATURES.ASSESSMENTS_PREMIUM),
    );
    const completed = attemptStats
      .filter((row) => row.status === 'COMPLETED')
      .reduce((sum, row) => sum + row._count._all, 0);
    const inProgress = attemptStats
      .filter((row) => row.status === 'IN_PROGRESS')
      .reduce((sum, row) => sum + row._count._all, 0);

    const [recommendations, recentBadges, resume, recentActivity] = await Promise.all([
      prisma.learningRecommendation.findMany({
        where: { userId, isDismissed: false, deletedAt: null },
        include: { skill: { select: { code: true, name: true } } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
        take: 6,
      }),
      prisma.fileObject.findFirst({
        where: {
          uploadedById: userId,
          purpose: 'OTHER',
          deletedAt: null,
          fileName: { contains: 'resume', mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, fileName: true, mimeType: true, createdAt: true },
      }),
      prisma.assessmentAttempt.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { assessment: { select: { title: true } } },
      }),
    ]);

    await gamificationService.recordDailyActivity(userId).catch(() => undefined);

    return {
      profile: {
        isComplete: user.profile?.isComplete ?? false,
        displayName: user.profile?.displayName ?? user.profile?.firstName ?? null,
        headline: user.profile?.headline ?? null,
        hasResume: Boolean(resume),
      },
      jrs: latestJrs
        ? {
            overallScore: Number(latestJrs.overallScore),
            band: latestJrs.band,
            version: latestJrs.version,
            calculatedAt: latestJrs.calculatedAt,
            skillScores: latestJrs.skillScores.map((score) => ({
              skillId: score.skillId,
              skillCode: score.skill.code,
              skillName: score.skill.name,
              score: Number(score.score),
              weight: Number(score.weight),
            })),
          }
        : null,
      assessments: {
        completed,
        inProgress,
        available: isPremium ? availableFree + availablePremium : availableFree,
        availableFree,
        availablePremium,
      },
      latestAttempt: latestAttempt
        ? {
            id: latestAttempt.id,
            assessmentId: latestAttempt.assessmentId,
            attemptNumber: latestAttempt.attemptNumber,
            status: latestAttempt.status,
            startedAt: latestAttempt.startedAt,
            submittedAt: latestAttempt.submittedAt,
            resultsLocked: latestAttempt.resultsLocked,
            assessmentTitle: latestAttempt.assessment.title,
            assessmentSlug: latestAttempt.assessment.slug,
            aiSummary: latestAttempt.aiEvaluation?.summary ?? null,
          }
        : null,
      gamification,
      badges: recentBadges.map((item) => ({
        code: item.badge.code,
        name: item.badge.name,
        description: item.badge.description,
        iconKey: item.badge.iconKey,
        earnedAt: item.earnedAt,
      })),
      recommendations: recommendations.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        skill: item.skill,
      })),
      recentActivity: recentActivity.map((attempt) => ({
        id: attempt.id,
        type: 'assessment' as const,
        title: attempt.assessment.title,
        status: attempt.status,
        at: attempt.updatedAt,
      })),
      progressTrend: isPremium
        ? jrsHistory.map((point) => ({
            overallScore: Number(point.overallScore),
            band: point.band,
            calculatedAt: point.calculatedAt,
            assessmentTitle: point.attempt.assessment.title,
          }))
        : [],
      subscription: {
        planCode: subscription?.planCode ?? 'FREE',
        status: subscription?.status ?? 'NONE',
        features: subscription?.featureKeys ?? [],
        canAccessPremium: isPremium,
        isPremium,
      },
      resultsLocked: false,
      nextSteps: buildNextSteps({
        hasJrs: Boolean(latestJrs),
        hasResume: Boolean(resume),
        profileComplete: user.profile?.isComplete ?? false,
        inProgress,
        completed,
        isPremium,
      }),
      premiumHighlights: isPremium
        ? [
            'Premium assessments unlocked in your catalog',
            'Detailed skill analytics and progress trends',
            'Priority learning recommendations after each evaluation',
          ]
        : [],
      upsell: isPremium
        ? null
        : {
            title: 'Unlock Premium',
            message:
              'Premium adds advanced assessments, detailed reports, and guided learning modules.',
            cta: 'View Premium',
            href: '/premium',
          },
    };
  }

  async getProgress(userId: string) {
    const [jrsHistory, attempts, skillLatest] = await Promise.all([
      prisma.jobReadinessScore.findMany({
        where: { userId },
        orderBy: { calculatedAt: 'asc' },
        include: {
          attempt: {
            select: {
              id: true,
              assessment: { select: { title: true, slug: true, accessTier: true } },
            },
          },
          skillScores: {
            include: { skill: { select: { code: true, name: true } } },
          },
        },
      }),
      prisma.assessmentAttempt.findMany({
        where: { userId, status: 'COMPLETED' },
        orderBy: { completedAt: 'asc' },
        include: {
          assessment: { select: { title: true, accessTier: true } },
          evaluation: { select: { percentage: true, passed: true } },
        },
      }),
      prisma.jobReadinessScore.findFirst({
        where: { userId },
        orderBy: { calculatedAt: 'desc' },
        include: {
          skillScores: {
            include: { skill: { select: { code: true, name: true } } },
            orderBy: { score: 'desc' },
          },
        },
      }),
    ]);

    const first = jrsHistory[0];
    const last = jrsHistory[jrsHistory.length - 1];
    const delta = first && last ? Number(last.overallScore) - Number(first.overallScore) : 0;

    return {
      jrsHistory: jrsHistory.map((point) => ({
        overallScore: Number(point.overallScore),
        band: point.band,
        calculatedAt: point.calculatedAt,
        attemptId: point.attemptId,
        assessmentTitle: point.attempt.assessment.title,
        accessTier: point.attempt.assessment.accessTier,
      })),
      assessmentComparisons: attempts.map((attempt) => ({
        attemptId: attempt.id,
        title: attempt.assessment.title,
        accessTier: attempt.assessment.accessTier,
        completedAt: attempt.completedAt,
        score:
          attempt.evaluation?.percentage != null ? Number(attempt.evaluation.percentage) : null,
        passed: attempt.evaluation?.passed ?? null,
      })),
      improvement: {
        jrsDelta: Number(delta.toFixed(2)),
        direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
        points: jrsHistory.length,
      },
      latestSkills: skillLatest
        ? skillLatest.skillScores.map((score) => ({
            skillCode: score.skill.code,
            skillName: score.skill.name,
            score: Number(score.score),
          }))
        : [],
    };
  }

  async getStats(userId: string) {
    const [completed, inProgress, reports, badges, jrsCount] = await Promise.all([
      prisma.assessmentAttempt.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.assessmentAttempt.count({ where: { userId, status: 'IN_PROGRESS' } }),
      prisma.aiReport.count({ where: { userId, status: 'READY' } }),
      prisma.userBadge.count({ where: { userId } }),
      prisma.jobReadinessScore.count({ where: { userId } }),
    ]);
    return { completed, inProgress, reports, badges, jrsCount };
  }

  async getActivity(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [attempts, badges, totalAttempts] = await Promise.all([
      prisma.assessmentAttempt.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: { assessment: { select: { title: true } } },
      }),
      prisma.userBadge.findMany({
        where: { userId },
        orderBy: { earnedAt: 'desc' },
        take: 10,
        include: { badge: true },
      }),
      prisma.assessmentAttempt.count({ where: { userId } }),
    ]);

    const items = [
      ...attempts.map((attempt) => ({
        type: 'assessment' as const,
        id: attempt.id,
        title: attempt.assessment.title,
        status: attempt.status,
        at: attempt.updatedAt,
      })),
      ...badges.map((badge) => ({
        type: 'badge' as const,
        id: badge.id,
        title: badge.badge.name,
        status: 'EARNED',
        at: badge.earnedAt,
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    return {
      items: items.slice(0, limit),
      meta: {
        page,
        limit,
        total: totalAttempts + badges.length,
        totalPages: Math.max(1, Math.ceil((totalAttempts + badges.length) / limit)),
        hasNextPage: page * limit < totalAttempts + badges.length,
        hasPreviousPage: page > 1,
      },
    };
  }
}

function buildNextSteps(input: {
  profileComplete: boolean;
  hasResume: boolean;
  hasJrs: boolean;
  inProgress: number;
  completed: number;
  isPremium: boolean;
}) {
  const steps: Array<{ key: string; title: string; href: string }> = [];
  if (!input.profileComplete) {
    steps.push({ key: 'profile', title: 'Complete your profile', href: '/profile' });
  }
  if (!input.hasResume) {
    steps.push({ key: 'resume', title: 'Upload your resume', href: '/profile' });
  }
  if (input.inProgress > 0) {
    steps.push({
      key: 'resume-assessment',
      title: 'Resume your in-progress assessment',
      href: '/assessments',
    });
  } else if (input.completed === 0) {
    steps.push({
      key: 'start-assessment',
      title: input.isPremium ? 'Start a Premium assessment' : 'Take a free assessment',
      href: '/assessments',
    });
  } else if (!input.hasJrs) {
    steps.push({ key: 'view-results', title: 'Review your latest results', href: '/history' });
  } else if (input.isPremium) {
    steps.push({
      key: 'analytics',
      title: 'Review detailed skill analytics',
      href: '/analytics',
    });
    steps.push({
      key: 'progress',
      title: 'Track your progress trends',
      href: '/progress',
    });
  } else {
    steps.push({
      key: 'improve',
      title: 'Follow your learning recommendations',
      href: '/dashboard',
    });
    steps.push({ key: 'premium', title: 'Explore Premium features', href: '/premium' });
  }
  return steps.slice(0, 4);
}

export const dashboardService = new DashboardService();
