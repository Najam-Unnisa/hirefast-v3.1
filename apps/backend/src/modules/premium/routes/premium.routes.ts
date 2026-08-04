import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
import { PLAN_FEATURES } from '../../../constants/subscription';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { requireFeature } from '../../../middlewares/subscription.middleware';
import { subscriptionsController } from '../../subscriptions/controller/subscriptions.controller';
import { usersController } from '../../users/controller/users.controller';
import { dashboardController } from '../../dashboard/controller/dashboard.controller';

/**
 * Premium-entitled surface area.
 * Commercial access is enforced via subscription feature keys — never RBAC roles.
 */
const premiumRouter = Router();

premiumRouter.use(authenticate, authorize(ROLES.USER, ROLES.ADMIN));

premiumRouter.get(
  '/assessments',
  requireFeature(PLAN_FEATURES.ASSESSMENTS_PREMIUM),
  (req, res, next) => subscriptionsController.listPremiumAssessments(req, res, next),
);

premiumRouter.get('/reports', requireFeature(PLAN_FEATURES.REPORTS_DETAILED), (req, res, next) =>
  usersController.listMyReports(req, res, next),
);

premiumRouter.get(
  '/recommendations',
  requireFeature(PLAN_FEATURES.LEARNING_RECOMMENDATIONS),
  (req, res, next) => usersController.listRecommendations(req, res, next),
);

premiumRouter.get(
  '/analytics/skills',
  requireFeature(PLAN_FEATURES.ANALYTICS_ADVANCED),
  (req, res, next) => usersController.getSkillAnalytics(req, res, next),
);

premiumRouter.get('/progress', requireFeature(PLAN_FEATURES.ANALYTICS_ADVANCED), (req, res, next) =>
  dashboardController.getProgress(req, res, next),
);

export { premiumRouter };
