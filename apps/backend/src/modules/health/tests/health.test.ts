import request from 'supertest';
import { createApp } from '../../../app';

describe('Health Module', () => {
  const app = createApp();

  it('GET /health returns a success envelope', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(600);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
  });

  it('GET /api/v1/health returns a success envelope', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('data');
  });
});
