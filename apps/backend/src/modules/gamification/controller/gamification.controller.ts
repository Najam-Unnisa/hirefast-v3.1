import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { sendSuccess } from '../../../utils/api-response';
import { gamificationService } from '../../../services/gamification.service';

export class GamificationController {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await gamificationService.getSummary(req.user!.sub),
        'Gamification summary retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getXp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      sendSuccess(
        res,
        await gamificationService.listXpTransactions(req.user!.sub, page, limit),
        'XP ledger retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getMyBadges(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await gamificationService.listEarnedBadges(req.user!.sub),
        'Earned badges retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getBadges(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await gamificationService.listBadgeCatalog(), 'Badge catalog retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getLevels(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await gamificationService.listLevels(), 'Levels retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getStreak(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await gamificationService.getStreak(req.user!.sub), 'Streak retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getLeaderboard(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        {
          items: [],
          meta: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            featureEnabled: false,
          },
        },
        'Leaderboard is not enabled yet.',
      );
    } catch (error) {
      next(error);
    }
  }
}

export const gamificationController = new GamificationController();
