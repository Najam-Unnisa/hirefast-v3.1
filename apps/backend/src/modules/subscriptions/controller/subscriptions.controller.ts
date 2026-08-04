import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { sendSuccess } from '../../../utils/api-response';
import { subscriptionsService } from '../service/subscriptions.service';

export class SubscriptionsController {
  async listPlans(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await subscriptionsService.listPlans(), 'Plans retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await subscriptionsService.getMySubscription(req.user!.sub),
        'Subscription retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getFeatures(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await subscriptionsService.getMyFeatures(req.user!.sub),
        'Features retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionsController = new SubscriptionsController();
