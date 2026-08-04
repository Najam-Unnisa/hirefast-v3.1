import request from 'supertest';

jest.mock('../service/auth.service', () => ({
  authService: {
    startGoogleAuth: jest.fn(),
    handleGoogleCallback: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    getSession: jest.fn(),
    devGuestLogin: jest.fn(async (email: string) => {
      const { createAuthTokens } = jest.requireActual(
        '../../../utils/jwt',
      ) as typeof import('../../../utils/jwt');
      const tokens = createAuthTokens({
        sub: '1da8fdf0-a216-4868-a1ab-f7be820fe908',
        email,
        role: 'GUEST',
      });
      return {
        ...tokens,
        refreshToken: 'opaque-test-refresh-token',
      };
    }),
  },
}));

const mockListAssessments = jest.fn(async () => [
  {
    id: '6dffb21d-88f1-4cb4-8b31-297d15f8f7a6',
    code: 'GENERAL_COMMUNICATION',
    slug: 'general-communication',
    accessTier: 'FREE',
    status: 'PUBLISHED',
  },
]);

jest.mock('../../assessments/service/assessments.service', () => ({
  assessmentsService: {
    listAssessments: mockListAssessments,
  },
}));

import { createApp } from '../../../app';

describe('Guest authentication and assessment access', () => {
  const app = createApp();

  it('rejects GET /auth/me without an access token', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('uses development guest login to list the guest assessment', async () => {
    const login = await request(app)
      .post('/api/v1/auth/dev/guest')
      .send({ email: 'guest@example.test' });

    expect(login.status).toBe(201);
    expect(login.body.data.accessToken).toEqual(expect.any(String));

    const response = await request(app)
      .get('/api/v1/assessments')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        code: 'GENERAL_COMMUNICATION',
        accessTier: 'FREE',
      }),
    ]);
    expect(mockListAssessments).toHaveBeenCalledWith('GUEST', expect.any(String));
  });
});
