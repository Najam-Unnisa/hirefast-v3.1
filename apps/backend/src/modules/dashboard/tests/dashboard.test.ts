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

const mockGetDashboard = jest.fn(async () => ({
  profile: { isComplete: true, displayName: 'Test User' },
  jrs: null,
  assessments: { completed: 0, inProgress: 0, available: 2 },
  gamification: {
    totalXp: 0,
    level: { levelNumber: 1, name: 'Starter' },
    currentStreak: 0,
    badgesEarned: 0,
  },
  subscription: { planCode: 'FREE', status: 'ACTIVE' },
}));

jest.mock('../service/dashboard.service', () => ({
  dashboardService: {
    getDashboard: mockGetDashboard,
    getActivity: jest.fn(async () => ({ items: [], meta: { page: 1, limit: 20, total: 0 } })),
  },
}));

jest.mock('../../../services/subscription-access.service', () => ({
  getActiveSubscription: jest.fn(async () => ({
    subscriptionId: 'sub-1',
    planId: 'plan-1',
    planCode: 'FREE',
    status: 'ACTIVE',
    currentPeriodEnd: new Date(Date.now() + 86_400_000),
    featureKeys: ['dashboard.access', 'assessments.free', 'reports.basic', 'gamification.access'],
  })),
  userHasFeature: jest.fn(async () => true),
  userHasPlan: jest.fn(async () => true),
  userHasPremiumAccess: jest.fn(async () => false),
}));

import { createAuthTokens } from '../../../utils/jwt';
import { createApp } from '../../../app';

describe('Registered freemium dashboard access', () => {
  const app = createApp();
  const tokens = createAuthTokens({
    sub: '1da8fdf0-a216-4868-a1ab-f7be820fe908',
    email: 'user@example.test',
    role: 'USER',
  });

  it('allows registered users with FREE plan features to load the dashboard', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockGetDashboard).toHaveBeenCalledWith('1da8fdf0-a216-4868-a1ab-f7be820fe908');
  });

  it('rejects guests from the freemium dashboard', async () => {
    const guest = createAuthTokens({
      sub: '2da8fdf0-a216-4868-a1ab-f7be820fe908',
      email: 'guest@example.test',
      role: 'GUEST',
    });
    const response = await request(app)
      .get('/api/v1/dashboard/me')
      .set('Authorization', `Bearer ${guest.accessToken}`);

    expect(response.status).toBe(403);
  });
});
