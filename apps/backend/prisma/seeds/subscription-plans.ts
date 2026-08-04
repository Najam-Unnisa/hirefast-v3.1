import type { PrismaClient } from '@prisma/client';

export async function seedSubscriptionPlans(prisma: PrismaClient): Promise<void> {
  const freemium = await prisma.subscriptionPlan.upsert({
    where: { code: 'FREEMIUM' },
    update: {
      name: 'Freemium',
      description: 'Free registered candidate access',
      priceCents: 0,
      currency: 'USD',
      billingPeriod: 'none',
      isActive: true,
      sortOrder: 1,
    },
    create: {
      code: 'FREEMIUM',
      name: 'Freemium',
      description: 'Free registered candidate access',
      priceCents: 0,
      currency: 'USD',
      billingPeriod: 'none',
      isActive: true,
      sortOrder: 1,
    },
  });

  const premium = await prisma.subscriptionPlan.upsert({
    where: { code: 'PREMIUM' },
    update: {
      name: 'Premium',
      description: 'Full HireFast platform access',
      priceCents: 1999,
      currency: 'USD',
      billingPeriod: 'monthly',
      isActive: true,
      sortOrder: 2,
    },
    create: {
      code: 'PREMIUM',
      name: 'Premium',
      description: 'Full HireFast platform access',
      priceCents: 1999,
      currency: 'USD',
      billingPeriod: 'monthly',
      isActive: true,
      sortOrder: 2,
    },
  });

  const freemiumFeatures = [
    'dashboard.access',
    'assessments.free',
    'reports.basic',
    'gamification.access',
  ];

  const premiumFeatures = [
    ...freemiumFeatures,
    'assessments.premium',
    'reports.detailed',
    'analytics.advanced',
    'learning.recommendations',
    'ai.premium_features',
  ];

  for (const featureKey of freemiumFeatures) {
    await prisma.planFeature.upsert({
      where: {
        planId_featureKey: { planId: freemium.id, featureKey },
      },
      update: {},
      create: {
        planId: freemium.id,
        featureKey,
        description: `Freemium feature: ${featureKey}`,
      },
    });
  }

  for (const featureKey of premiumFeatures) {
    await prisma.planFeature.upsert({
      where: {
        planId_featureKey: { planId: premium.id, featureKey },
      },
      update: {},
      create: {
        planId: premium.id,
        featureKey,
        description: `Premium feature: ${featureKey}`,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.info('[seed] Subscription plans ready');
}
