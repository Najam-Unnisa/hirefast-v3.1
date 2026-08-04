import { Router } from 'express';
import { env } from '../../../config/env';
import { authenticate } from '../../../middlewares/auth.middleware';
import { authController } from '../controller/auth.controller';

const authRouter = Router();

authRouter.post('/google', (req, res, next) => authController.startGoogleAuth(req, res, next));
authRouter.get('/google/callback', (req, res, next) =>
  authController.googleCallback(req, res, next),
);
authRouter.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
authRouter.post('/logout', (req, res, next) => authController.logout(req, res, next));
authRouter.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
authRouter.get('/session', authenticate, (req, res, next) =>
  authController.getSession(req, res, next),
);

if (!env.isProduction) {
  authRouter.post('/dev/guest', (req, res, next) => authController.devGuestLogin(req, res, next));
}

export { authRouter };
