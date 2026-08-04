import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
import { PLAN_FEATURES } from '../../../constants/subscription';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { requireFeature } from '../../../middlewares/subscription.middleware';
import { gamificationController } from '../controller/gamification.controller';

const gamificationRouter = Router();

gamificationRouter.use(
  authenticate,
  authorize(ROLES.USER, ROLES.ADMIN),
  requireFeature(PLAN_FEATURES.GAMIFICATION_ACCESS),
);

gamificationRouter.get('/me', (req, res, next) => gamificationController.getMe(req, res, next));
gamificationRouter.get('/me/xp', (req, res, next) => gamificationController.getXp(req, res, next));
gamificationRouter.get('/me/badges', (req, res, next) =>
  gamificationController.getMyBadges(req, res, next),
);
gamificationRouter.get('/me/streak', (req, res, next) =>
  gamificationController.getStreak(req, res, next),
);
gamificationRouter.get('/badges', (req, res, next) =>
  gamificationController.getBadges(req, res, next),
);
gamificationRouter.get('/levels', (req, res, next) =>
  gamificationController.getLevels(req, res, next),
);
gamificationRouter.get('/leaderboard', (req, res, next) =>
  gamificationController.getLeaderboard(req, res, next),
);

export { gamificationRouter };
