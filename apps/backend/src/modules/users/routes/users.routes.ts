import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
import { PLAN_FEATURES } from '../../../constants/subscription';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { requireFeature } from '../../../middlewares/subscription.middleware';
import { usersController } from '../controller/users.controller';

const usersRouter = Router();

usersRouter.get(
  '/me/profile',
  authenticate,
  authorize(ROLES.GUEST, ROLES.USER, ROLES.ADMIN),
  (req, res, next) => usersController.getMyProfile(req, res, next),
);
usersRouter.patch(
  '/me/profile',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  (req, res, next) => usersController.updateMyProfile(req, res, next),
);
usersRouter.put('/me/profile', authenticate, authorize(ROLES.USER, ROLES.ADMIN), (req, res, next) =>
  usersController.updateMyProfile(req, res, next),
);
usersRouter.post('/me/profile/complete', authenticate, authorize(ROLES.GUEST), (req, res, next) =>
  usersController.completeProfile(req, res, next),
);
usersRouter.put('/me/resume', authenticate, authorize(ROLES.USER, ROLES.ADMIN), (req, res, next) =>
  usersController.uploadResume(req, res, next),
);
usersRouter.get(
  '/me/jrs/latest',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  requireFeature(PLAN_FEATURES.REPORTS_BASIC),
  (req, res, next) => usersController.getLatestJrs(req, res, next),
);
usersRouter.get(
  '/me/reports',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  requireFeature(PLAN_FEATURES.REPORTS_BASIC),
  (req, res, next) => usersController.listMyReports(req, res, next),
);
usersRouter.get(
  '/me/recommendations',
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  (req, res, next) => usersController.listRecommendations(req, res, next),
);

export { usersRouter };
