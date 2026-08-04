import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { sendSuccess } from '../../../utils/api-response';
import { trackEvent } from '../../../services/analytics.service';
import { dashboardService } from '../service/dashboard.service';

export class DashboardController {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getDashboard(req.user!.sub);
      trackEvent({
        eventName: data.subscription.isPremium ? 'premium.dashboard_viewed' : 'dashboard.viewed',
        userId: req.user!.sub,
      });
      sendSuccess(res, data, 'Dashboard retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getActivity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      sendSuccess(
        res,
        await dashboardService.getActivity(req.user!.sub, page, limit),
        'Activity retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      trackEvent({
        eventName: 'progress_tracking.viewed',
        userId: req.user!.sub,
      });
      sendSuccess(res, await dashboardService.getProgress(req.user!.sub), 'Progress retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await dashboardService.getStats(req.user!.sub), 'Stats retrieved.');
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
