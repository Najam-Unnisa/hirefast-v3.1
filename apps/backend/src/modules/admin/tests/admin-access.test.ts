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
    devAdminLogin: jest.fn(),
  },
}));

const mockOverview = jest.fn(async () => ({
  totalCandidates: 10,
  guestUsers: 3,
  registeredUsers: 7,
  premiumUsers: 2,
  activeAssessments: 2,
  pendingEvaluations: 1,
  completedEvaluations: 5,
  failedEvaluations: 0,
}));

jest.mock('../service/admin-ops.service', () => ({
  adminOpsService: {
    getOverview: mockOverview,
    listAnalyticsEvents: jest.fn(async () => ({ items: [], meta: { page: 1, total: 0 } })),
    ingestAdminEvent: jest.fn(),
    listReports: jest.fn(),
    getPlatformReport: jest.fn(),
    listSettings: jest.fn(async () => []),
    upsertSetting: jest.fn(),
    listAuditLogs: jest.fn(async () => ({ items: [], meta: { page: 1, total: 0 } })),
    listEvaluations: jest.fn(),
    retryEvaluation: jest.fn(),
    getAttemptReview: jest.fn(),
    listHrReviews: jest.fn(),
    getHrReview: jest.fn(),
    createHrReview: jest.fn(),
    patchHrReview: jest.fn(),
  },
}));

jest.mock('../service/admin-users.service', () => ({
  adminUsersService: {
    listUsers: jest.fn(async () => ({ items: [], meta: { page: 1, total: 0 } })),
    getUser: jest.fn(),
    patchUser: jest.fn(),
    listUserAttempts: jest.fn(),
    listUserReports: jest.fn(),
  },
  countUsersByPlan: jest.fn(),
  PLAN_CODES: { FREE: 'FREE', PREMIUM: 'PREMIUM' },
}));

jest.mock('../service/admin-assessments.service', () => ({
  adminAssessmentsService: {
    listAssessments: jest.fn(async () => ({ items: [], meta: { page: 1, total: 0 } })),
    getAssessment: jest.fn(),
    createAssessment: jest.fn(),
    updateAssessment: jest.fn(),
    patchStatus: jest.fn(),
    duplicateAssessment: jest.fn(),
    listQuestions: jest.fn(),
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
    addOption: jest.fn(),
    updateOption: jest.fn(),
    deleteOption: jest.fn(),
    listCategories: jest.fn(),
    listSkills: jest.fn(),
    updateSkillWeight: jest.fn(),
  },
}));

jest.mock('../../../services/subscription-access.service', () => ({
  getActiveSubscription: jest.fn(async () => null),
  userHasFeature: jest.fn(async () => false),
  userHasPlan: jest.fn(async () => false),
  userHasPremiumAccess: jest.fn(async () => false),
}));

import { createAuthTokens } from '../../../utils/jwt';
import { createApp } from '../../../app';

describe('Admin portal access', () => {
  const app = createApp();
  const admin = createAuthTokens({
    sub: '1da8fdf0-a216-4868-a1ab-f7be820fe908',
    email: 'admin@hirefast.local',
    role: 'ADMIN',
  });
  const user = createAuthTokens({
    sub: '2da8fdf0-a216-4868-a1ab-f7be820fe908',
    email: 'user@example.test',
    role: 'USER',
  });

  it('allows ADMIN to load analytics overview', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockOverview).toHaveBeenCalled();
  });

  it('rejects USER from admin overview', async () => {
    const response = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${user.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('rejects unauthenticated access', async () => {
    const response = await request(app).get('/api/v1/admin/users');
    expect(response.status).toBe(401);
  });
});
