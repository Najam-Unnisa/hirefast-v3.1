import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { sendSuccess } from '../../../utils/api-response';
import { dashboardService } from '../service/dashboard.service';

export class DashboardController {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await dashboardService.getDashboard(req.user!.sub), 'Dashboard retrieved.');
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
}

export const dashboardController = new DashboardController();
