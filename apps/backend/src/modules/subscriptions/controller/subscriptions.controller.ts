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

  async validateFeature(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await subscriptionsService.validateFeature(req.user!.sub, req.body?.featureKey),
        'Feature validated.',
      );
    } catch (error) {
      next(error);
    }
  }

  async activatePremium(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await subscriptionsService.activatePremium(req.user!.sub),
        'Premium activated.',
      );
    } catch (error) {
      next(error);
    }
  }

  async downgrade(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await subscriptionsService.downgradeToFree(req.user!.sub),
        'Downgraded to Free plan.',
      );
    } catch (error) {
      next(error);
    }
  }

  async expireForTesting(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await subscriptionsService.expirePremiumForTesting(req.user!.sub),
        'Premium expired for testing.',
      );
    } catch (error) {
      next(error);
    }
  }

  async listPremiumAssessments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await subscriptionsService.listPremiumAssessments(req.user!.sub),
        'Premium assessments retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionsController = new SubscriptionsController();
