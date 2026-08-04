import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
import { PLAN_FEATURES } from '../../../constants/subscription';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { requireFeature } from '../../../middlewares/subscription.middleware';
import { dashboardController } from '../controller/dashboard.controller';

const dashboardRouter = Router();

dashboardRouter.use(
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  requireFeature(PLAN_FEATURES.DASHBOARD_ACCESS),
);

dashboardRouter.get('/me', (req, res, next) => dashboardController.getMe(req, res, next));
dashboardRouter.get('/me/activity', (req, res, next) =>
  dashboardController.getActivity(req, res, next),
);

export { dashboardRouter };
