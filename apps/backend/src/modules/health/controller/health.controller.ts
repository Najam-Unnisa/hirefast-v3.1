import type { Request, Response, NextFunction } from 'express';
import { healthService } from '../service/health.service';
import { sendSuccess } from '../../../utils/api-response';

export class HealthController {
  async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await healthService.getHealth();
      const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;
      sendSuccess(res, health, 'Health check completed.', statusCode);
    } catch (error) {
      next(error);
    }
  }
}

export const healthController = new HealthController();
