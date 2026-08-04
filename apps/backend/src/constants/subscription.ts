import type { SubscriptionPlanCodeValue } from '@hirefast/shared-types';
import { SubscriptionPlanCode } from '@hirefast/shared-types';

/**
 * Commercial plan codes — single source of truth for paid access.
 * Adding PRO / STUDENT / ENTERPRISE later requires plan + features only (no new RBAC roles).
 */
export const PLAN_CODES = {
  FREE: SubscriptionPlanCode.FREE,
  PREMIUM: SubscriptionPlanCode.PREMIUM,
} as const satisfies Record<string, SubscriptionPlanCodeValue>;

export const ACTIVE_SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIALING'] as const;

export type ActiveSubscriptionStatus = (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number];

/** Well-known plan feature keys (seeded on plans) */
export const PLAN_FEATURES = {
  DASHBOARD_ACCESS: 'dashboard.access',
  ASSESSMENTS_FREE: 'assessments.free',
  ASSESSMENTS_PREMIUM: 'assessments.premium',
  REPORTS_BASIC: 'reports.basic',
  REPORTS_DETAILED: 'reports.detailed',
  GAMIFICATION_ACCESS: 'gamification.access',
  ANALYTICS_ADVANCED: 'analytics.advanced',
  LEARNING_RECOMMENDATIONS: 'learning.recommendations',
  AI_PREMIUM_FEATURES: 'ai.premium_features',
} as const;

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES];
export type PlanFeatureCode = (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES];
