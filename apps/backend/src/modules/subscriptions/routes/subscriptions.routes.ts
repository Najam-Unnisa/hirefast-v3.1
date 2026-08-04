import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
import { env } from '../../../config/env';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { subscriptionsController } from '../controller/subscriptions.controller';

const subscriptionsRouter = Router();

subscriptionsRouter.get(
  '/plans',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN, ROLES.GUEST),
  (req, res, next) => subscriptionsController.listPlans(req, res, next),
);
subscriptionsRouter.get('/me', authenticate, authorize(ROLES.USER, ROLES.ADMIN), (req, res, next) =>
  subscriptionsController.getMe(req, res, next),
);
subscriptionsRouter.get(
  '/me/features',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  (req, res, next) => subscriptionsController.getFeatures(req, res, next),
);
subscriptionsRouter.post(
  '/me/validate-feature',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  (req, res, next) => subscriptionsController.validateFeature(req, res, next),
);
subscriptionsRouter.post(
  '/me/activate-premium',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  (req, res, next) => subscriptionsController.activatePremium(req, res, next),
);
subscriptionsRouter.post(
  '/me/downgrade',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  (req, res, next) => subscriptionsController.downgrade(req, res, next),
);

if (!env.isProduction) {
  subscriptionsRouter.post(
    '/dev/expire-premium',
    authenticate,
    authorize(ROLES.USER, ROLES.ADMIN),
    (req, res, next) => subscriptionsController.expireForTesting(req, res, next),
  );
}

export { subscriptionsRouter };
