import type { PrismaClient } from '@prisma/client';

export async function seedGamification(prisma: PrismaClient): Promise<void> {
  const levels = [
    { levelNumber: 1, name: 'Starter', minXp: 0, maxXp: 99 },
    { levelNumber: 2, name: 'Explorer', minXp: 100, maxXp: 299 },
    { levelNumber: 3, name: 'Builder', minXp: 300, maxXp: 599 },
    { levelNumber: 4, name: 'Achiever', minXp: 600, maxXp: 999 },
    { levelNumber: 5, name: 'Professional', minXp: 1000, maxXp: 1999 },
    { levelNumber: 6, name: 'Expert', minXp: 2000, maxXp: 3999 },
    { levelNumber: 7, name: 'Leader', minXp: 4000, maxXp: null },
  ] as const;

  for (const level of levels) {
    await prisma.level.upsert({
      where: { levelNumber: level.levelNumber },
      update: {
        name: level.name,
        minXp: level.minXp,
        maxXp: level.maxXp,
      },
      create: level,
    });
  }

  const badges = [
    {
      code: 'FIRST_ASSESSMENT',
      name: 'First Steps',
      description: 'Completed your first assessment',
      iconKey: 'badge-first-assessment',
      xpReward: 50,
    },
    {
      code: 'STREAK_3',
      name: 'On a Roll',
      description: 'Maintained a 3-day streak',
      iconKey: 'badge-streak-3',
      xpReward: 30,
    },
    {
      code: 'STREAK_7',
      name: 'Week Warrior',
      description: 'Maintained a 7-day streak',
      iconKey: 'badge-streak-7',
      xpReward: 100,
    },
    {
      code: 'PROFILE_COMPLETE',
      name: 'Profile Pro',
      description: 'Completed your candidate profile',
      iconKey: 'badge-profile',
      xpReward: 25,
    },
    {
      code: 'COMMUNICATION_READY',
      name: 'Communication Ready',
      description: 'Completed the General Communication Assessment',
      iconKey: 'badge-communication',
      xpReward: 75,
    },
    {
      code: 'PREMIUM_MEMBER',
      name: 'Premium Member',
      description: 'Activated HireFast Premium',
      iconKey: 'badge-premium',
      xpReward: 100,
    },
    {
      code: 'PREMIUM_ASSESSMENT',
      name: 'Premium Practitioner',
      description: 'Completed a Premium assessment',
      iconKey: 'badge-premium-assessment',
      xpReward: 120,
    },
    {
      code: 'SKILL_ANALYST',
      name: 'Skill Analyst',
      description: 'Reviewed detailed skill analytics',
      iconKey: 'badge-analytics',
      xpReward: 40,
    },
  ] as const;

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        description: badge.description,
        iconKey: badge.iconKey,
        xpReward: badge.xpReward,
        isActive: true,
      },
      create: {
        ...badge,
        isActive: true,
      },
    });
  }

  const xpRules = [
    {
      eventKey: 'assessment.completed',
      sourceType: 'ASSESSMENT_COMPLETE' as const,
      xpAmount: 100,
      description: 'XP awarded when an assessment attempt is completed',
    },
    {
      eventKey: 'streak.daily',
      sourceType: 'DAILY_STREAK' as const,
      xpAmount: 10,
      description: 'XP awarded for maintaining a daily streak',
    },
    {
      eventKey: 'badge.unlocked',
      sourceType: 'BADGE_UNLOCK' as const,
      xpAmount: 0,
      description: 'Placeholder rule — badge XP comes from badge.xpReward',
    },
    {
      eventKey: 'premium.assessment.completed',
      sourceType: 'ASSESSMENT_COMPLETE' as const,
      xpAmount: 150,
      description: 'XP awarded when a Premium assessment is completed',
    },
    {
      eventKey: 'admin.adjustment',
      sourceType: 'ADMIN_ADJUSTMENT' as const,
      xpAmount: 0,
      description: 'Manual XP adjustments by admins',
    },
  ];

  for (const rule of xpRules) {
    await prisma.xpRule.upsert({
      where: { eventKey: rule.eventKey },
      update: {
        sourceType: rule.sourceType,
        xpAmount: rule.xpAmount,
        description: rule.description,
        isActive: true,
      },
      create: {
        ...rule,
        isActive: true,
      },
    });
  }

  // Attach gamification row for existing admin (level 1) if missing
  const admin = await prisma.user.findFirst({
    where: { email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@hirefast.local').toLowerCase() },
  });
  const level1 = await prisma.level.findUnique({ where: { levelNumber: 1 } });

  if (admin && level1) {
    await prisma.userGamification.upsert({
      where: { userId: admin.id },
      update: {},
      create: {
        userId: admin.id,
        levelId: level1.id,
        totalXp: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.info('[seed] Gamification (levels, badges, XP rules) ready');
}
