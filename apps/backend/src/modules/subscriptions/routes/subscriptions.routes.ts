import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
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

export { subscriptionsRouter };
