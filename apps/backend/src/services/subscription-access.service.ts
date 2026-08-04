import { prisma } from '../config/database';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  PLAN_CODES,
  type PlanCode,
  type PlanFeatureCode,
} from '../constants/subscription';

export type ActiveSubscriptionSnapshot = {
  subscriptionId: string;
  planId: string;
  planCode: string;
  status: string;
  currentPeriodEnd: Date;
  featureKeys: string[];
};

/**
 * Resolves the caller's commercial access from `user_subscriptions` + plan features.
 * Single source of truth for FREE / PREMIUM (and future plans) — never use RBAC roles.
 */
export async function getActiveSubscription(
  userId: string,
): Promise<ActiveSubscriptionSnapshot | null> {
  const now = new Date();

  const subscription = await prisma.userSubscription.findFirst({
    where: {
      userId,
      status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
      currentPeriodEnd: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: {
        include: {
          features: true,
        },
      },
    },
  });

  if (!subscription) {
    return null;
  }

  return {
    subscriptionId: subscription.id,
    planId: subscription.planId,
    planCode: subscription.plan.code,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    featureKeys: subscription.plan.features.map((f) => f.featureKey),
  };
}

export async function userHasPlan(
  userId: string,
  planCodes: readonly PlanCode[],
): Promise<boolean> {
  const snapshot = await getActiveSubscription(userId);
  if (!snapshot) {
    return false;
  }
  return (planCodes as readonly string[]).includes(snapshot.planCode);
}

export async function userHasFeature(
  userId: string,
  featureKey: PlanFeatureCode | string,
): Promise<boolean> {
  const snapshot = await getActiveSubscription(userId);
  if (!snapshot) {
    return false;
  }
  return snapshot.featureKeys.includes(featureKey);
}

export async function userHasPremiumAccess(userId: string): Promise<boolean> {
  return userHasPlan(userId, [PLAN_CODES.PREMIUM]);
}
