import type { HealthCheckResponse, ServiceStatus } from '@hirefast/shared-types';
import { checkDatabaseHealth } from '../../../config/database';
import { checkRedisHealth } from '../../../config/redis';
import { env } from '../../../config/env';

export class HealthService {
  async getHealth(): Promise<HealthCheckResponse> {
    const [databaseUp, redisUp] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

    const database: ServiceStatus = databaseUp ? 'up' : 'down';
    const redis: ServiceStatus = redisUp ? 'up' : 'down';
    const api: ServiceStatus = 'up';

    let status: HealthCheckResponse['status'] = 'ok';
    if (!databaseUp || !redisUp) {
      status = !databaseUp && !redisUp ? 'error' : 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
      services: {
        api,
        database,
        redis,
      },
      version: '1.0.0',
    };
  }
}

export const healthService = new HealthService();
