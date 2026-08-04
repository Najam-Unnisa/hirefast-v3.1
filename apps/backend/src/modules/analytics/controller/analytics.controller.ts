import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { sendSuccess } from '../../../utils/api-response';
import { analyticsIngestService } from '../service/analytics.service';

export class AnalyticsController {
  async ingest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      sendSuccess(
        res,
        analyticsIngestService.ingest(req.body?.eventName, authReq.user?.sub, req.body?.properties),
        'Analytics event recorded.',
        202,
      );
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
