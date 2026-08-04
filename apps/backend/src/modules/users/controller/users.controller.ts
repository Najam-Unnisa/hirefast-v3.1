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
}

export const usersController = new UsersController();
