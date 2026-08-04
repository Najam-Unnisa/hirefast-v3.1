import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { usersController } from '../controller/users.controller';

const usersRouter = Router();

usersRouter.get('/me/profile', authenticate, authorize(ROLES.GUEST, ROLES.USER), (req, res, next) =>
  usersController.getMyProfile(req, res, next),
);
usersRouter.post('/me/profile/complete', authenticate, authorize(ROLES.GUEST), (req, res, next) =>
  usersController.completeProfile(req, res, next),
);

export { usersRouter };
