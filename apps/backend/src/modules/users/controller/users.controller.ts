import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { sendSuccess } from '../../../utils/api-response';
import { usersService } from '../service/users.service';

export class UsersController {
  async getMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await usersService.getMyProfile(req.user!.sub), 'Profile retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async updateMyProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await usersService.updateMyProfile(req.user!.sub, req.body ?? {}),
        'Profile updated.',
      );
    } catch (error) {
      next(error);
    }
  }

  async completeProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await usersService.completeProfile(req.user!.sub, req.body?.firstName, req.body?.lastName),
        'Profile completed.',
      );
    } catch (error) {
      next(error);
    }
  }

  async uploadResume(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await usersService.attachResume(req.user!.sub, req.body ?? {}),
        'Resume uploaded.',
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async getLatestJrs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await usersService.getLatestJrs(req.user!.sub), 'Latest JRS retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async listMyReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      sendSuccess(
        res,
        await usersService.listMyReports(req.user!.sub, page, limit),
        'Reports retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await usersService.getReport(req.user!.sub, req.params.reportId, req.user!.role),
        'Report retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async listRecommendations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await usersService.listRecommendations(req.user!.sub),
        'Recommendations retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
