import request from 'supertest';

jest.mock('../../auth/service/auth.service', () => ({
  authService: {
    startGoogleAuth: jest.fn(),
    handleGoogleCallback: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    getSession: jest.fn(),
    devGuestLogin: jest.fn(),
  },
}));

const mockActivatePremium = jest.fn(async () => ({
  subscriptionId: 'sub-premium',
  planCode: 'PREMIUM',
  status: 'ACTIVE',
  isPremium: true,
  features: [
    'dashboard.access',
    'assessments.free',
    'assessments.premium',
    'reports.basic',
    'reports.detailed',
    'analytics.advanced',
    'learning.recommendations',
    'gamification.access',
    'ai.premium_features',
  ],
}));

const mockDowngrade = jest.fn(async () => ({
  planCode: 'FREE',
  status: 'ACTIVE',
  isPremium: false,
  features: ['dashboard.access', 'assessments.free', 'reports.basic', 'gamification.access'],
}));

const mockGetMySubscription = jest.fn(async () => ({
  planCode: 'FREE',
  status: 'ACTIVE',
  isPremium: false,
  features: ['dashboard.access', 'assessments.free', 'reports.basic', 'gamification.access'],
}));

const mockListPremiumAssessments = jest.fn(async () => [
  { id: 'a1', title: 'Advanced Leadership Communication', accessTier: 'PREMIUM' },
]);

const mockValidateFeature = jest.fn(async (_userId: string, featureKey: string) => ({
  featureKey,
  entitled: false,
}));

jest.mock('../service/subscriptions.service', () => ({
  subscriptionsService: {
    listPlans: jest.fn(async () => []),
    getMySubscription: mockGetMySubscription,
    getMyFeatures: jest.fn(async () => ({ features: [] })),
    validateFeature: mockValidateFeature,
    activatePremium: mockActivatePremium,
    downgradeToFree: mockDowngrade,
    expirePremiumForTesting: jest.fn(),
    listPremiumAssessments: mockListPremiumAssessments,
  },
}));

const mockGetActiveSubscription = jest.fn(async () => ({
  subscriptionId: 'sub-1',
  planId: 'plan-1',
  planCode: 'FREE',
  status: 'ACTIVE',
  currentPeriodEnd: new Date(Date.now() + 86_400_000),
  featureKeys: ['dashboard.access', 'assessments.free', 'reports.basic', 'gamification.access'],
}));

const mockUserHasFeature = jest.fn(async (_userId: string, featureKey: string) => {
  const snap = await mockGetActiveSubscription();
  return snap.featureKeys.includes(featureKey);
});

jest.mock('../../../services/subscription-access.service', () => ({
  getActiveSubscription: (...args: unknown[]) => mockGetActiveSubscription(...(args as [])),
  userHasFeature: (...args: unknown[]) => mockUserHasFeature(...(args as [string, string])),
  userHasPlan: jest.fn(async () => true),
  userHasPremiumAccess: jest.fn(async () => false),
}));

import { createAuthTokens } from '../../../utils/jwt';
import { createApp } from '../../../app';

const PREMIUM_FEATURES = [
  'dashboard.access',
  'assessments.free',
  'assessments.premium',
  'reports.basic',
  'reports.detailed',
  'analytics.advanced',
  'learning.recommendations',
  'gamification.access',
  'ai.premium_features',
];

describe('Premium subscription entitlements', () => {
  const app = createApp();
  const tokens = createAuthTokens({
    sub: '1da8fdf0-a216-4868-a1ab-f7be820fe908',
    email: 'premium@example.test',
    role: 'USER',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveSubscription.mockResolvedValue({
      subscriptionId: 'sub-1',
      planId: 'plan-1',
      planCode: 'FREE',
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      featureKeys: ['dashboard.access', 'assessments.free', 'reports.basic', 'gamification.access'],
    });
  });

  it('allows registered users to activate Premium', async () => {
    const response = await request(app)
      .post('/api/v1/subscriptions/me/activate-premium')
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockActivatePremium).toHaveBeenCalledWith('1da8fdf0-a216-4868-a1ab-f7be820fe908');
  });

  it('allows registered users to downgrade to Free', async () => {
    const response = await request(app)
      .post('/api/v1/subscriptions/me/downgrade')
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(response.status).toBe(200);
    expect(mockDowngrade).toHaveBeenCalled();
  });

  it('blocks Premium assessments route without assessments.premium feature', async () => {
    const response = await request(app)
      .get('/api/v1/premium/assessments')
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('allows Premium assessments route when assessments.premium is entitled', async () => {
    mockGetActiveSubscription.mockResolvedValue({
      subscriptionId: 'sub-premium',
      planId: 'plan-premium',
      planCode: 'PREMIUM',
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      featureKeys: PREMIUM_FEATURES,
    });

    const response = await request(app)
      .get('/api/v1/premium/assessments')
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(response.status).toBe(200);
    expect(mockListPremiumAssessments).toHaveBeenCalled();
  });

  it('blocks skill analytics without analytics.advanced', async () => {
    const response = await request(app)
      .get('/api/v1/premium/analytics/skills')
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('rejects guests from Premium activation', async () => {
    const guest = createAuthTokens({
      sub: '2da8fdf0-a216-4868-a1ab-f7be820fe908',
      email: 'guest@example.test',
      role: 'GUEST',
    });
    const response = await request(app)
      .post('/api/v1/subscriptions/me/activate-premium')
      .set('Authorization', `Bearer ${guest.accessToken}`);

    expect(response.status).toBe(403);
  });
});
