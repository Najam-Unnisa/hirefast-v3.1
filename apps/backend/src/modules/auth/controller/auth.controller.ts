import type { NextFunction, Request, Response } from 'express';
import { env } from '../../../config/env';
import type { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { sendSuccess } from '../../../utils/api-response';
import { authService } from '../service/auth.service';

export class AuthController {
  async startGoogleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const portal =
        req.body?.portal === 'admin' || req.query?.portal === 'admin' ? 'admin' : 'candidate';
      sendSuccess(res, await authService.startGoogleAuth(portal), 'Google authorization started.');
    } catch (error) {
      next(error);
    }
  }

  async googleCallback(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { tokens, portal } = await authService.handleGoogleCallback(
        typeof req.query.code === 'string' ? req.query.code : undefined,
        typeof req.query.state === 'string' ? req.query.state : undefined,
      );
      const query = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
      const baseUrl = portal === 'admin' ? env.adminUrl : env.appUrl;
      res.redirect(`${baseUrl}/auth/callback#${query.toString()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google authentication failed.';
      const query = new URLSearchParams({
        error: 'google_auth_failed',
        message,
      });
      const referer = typeof req.get === 'function' ? (req.get('referer') ?? '') : '';
      const towardAdmin =
        message.toLowerCase().includes('administrator') || referer.startsWith(env.adminUrl);
      const baseUrl = towardAdmin ? env.adminUrl : env.appUrl;
      // Errors may stay in query (non-secret); success tokens use the URL fragment only.
      res.redirect(`${baseUrl}/auth/callback?${query.toString()}`);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await authService.refresh(req.body?.refreshToken), 'Session refreshed.');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await authService.logout(req.body?.refreshToken), 'Logged out.');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await authService.getMe(req.user!.sub), 'Current user retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await authService.getSession(req.user!.sub), 'Session retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async devGuestLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await authService.devGuestLogin(req.body?.email),
        'Development guest session created.',
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async devAdminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await authService.devAdminLogin(req.body?.email),
        'Development admin session created.',
        201,
      );
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
