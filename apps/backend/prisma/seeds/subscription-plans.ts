import type { PrismaClient } from '@prisma/client';

/**
 * Commercial plans — single source of truth for paid / free product access.
 * Adding PRO / STUDENT / ENTERPRISE later: seed a plan + features only (no RBAC changes).
 */
export async function seedSubscriptionPlans(prisma: PrismaClient): Promise<void> {
  // Rename legacy FREEMIUM plan code → FREE if present
  const legacyFreemium = await prisma.subscriptionPlan.findUnique({ where: { code: 'FREEMIUM' } });
  if (legacyFreemium) {
    await prisma.subscriptionPlan.update({
      where: { id: legacyFreemium.id },
      data: {
        code: 'FREE',
        name: 'Free',
        description: 'Free registered candidate access',
        priceCents: 0,
        billingPeriod: 'none',
        isActive: true,
        sortOrder: 1,
      },
    });
  }

  const free = await prisma.subscriptionPlan.upsert({
    where: { code: 'FREE' },
    update: {
      name: 'Free',
      description: 'Free registered candidate access',
      priceCents: 0,
      currency: 'USD',
      billingPeriod: 'none',
      isActive: true,
      sortOrder: 1,
    },
    create: {
      code: 'FREE',
      name: 'Free',
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

  const freeFeatures = [
    'dashboard.access',
    'assessments.free',
    'reports.basic',
    'gamification.access',
  ];

  const premiumFeatures = [
    ...freeFeatures,
    'assessments.premium',
    'reports.detailed',
    'analytics.advanced',
    'learning.recommendations',
    'ai.premium_features',
  ];

  for (const featureKey of freeFeatures) {
    await prisma.planFeature.upsert({
      where: {
        planId_featureKey: { planId: free.id, featureKey },
      },
      update: {
        description: `Free plan feature: ${featureKey}`,
      },
      create: {
        planId: free.id,
        featureKey,
        description: `Free plan feature: ${featureKey}`,
      },
    });
  }

  for (const featureKey of premiumFeatures) {
    await prisma.planFeature.upsert({
      where: {
        planId_featureKey: { planId: premium.id, featureKey },
      },
      update: {
        description: `Premium plan feature: ${featureKey}`,
      },
      create: {
        planId: premium.id,
        featureKey,
        description: `Premium plan feature: ${featureKey}`,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.info('[seed] Subscription plans ready (FREE / PREMIUM)');
}
