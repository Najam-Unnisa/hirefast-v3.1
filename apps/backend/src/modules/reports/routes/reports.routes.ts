import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
import { PLAN_FEATURES } from '../../../constants/subscription';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { requireFeature } from '../../../middlewares/subscription.middleware';
import { usersController } from '../../users/controller/users.controller';

const reportsRouter = Router();

reportsRouter.get(
  '/:reportId',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  requireFeature(PLAN_FEATURES.REPORTS_BASIC),
  (req, res, next) => usersController.getReport(req, res, next),
);

export { reportsRouter };
