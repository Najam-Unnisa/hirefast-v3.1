import type { NextFunction, Request, Response } from 'express';
import { PLAN_CODES, type PlanCode, type PlanFeatureCode } from '../constants/subscription';
import {
  getActiveSubscription,
  type ActiveSubscriptionSnapshot,
} from '../services/subscription-access.service';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Loads the caller's active subscription onto `req.subscription`.
 * Must run after `authenticate` (requires `req.user.sub`).
 *
 * Commercial access is resolved ONLY here — never via RBAC roles (`role === PREMIUM` is forbidden).
 */
export function resolveSubscription(options: { optional?: boolean } = {}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        next(new UnauthorizedError('Authentication required before subscription check.'));
        return;
      }

      const snapshot = await getActiveSubscription(userId);
      req.subscription = snapshot;

      if (!options.optional && !snapshot) {
        logger.warn('Subscription failure: no active subscription', {
          path: req.path,
          method: req.method,
          userId,
        });
        next(
          new ForbiddenError('An active subscription is required for this resource.', [
            { message: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' },
          ]),
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Requires an active subscription whose plan code is one of `planCodes`.
 * Example: `requirePlan(PLAN_CODES.PREMIUM)` for premium assessments.
 */
export function requirePlan(...planCodes: PlanCode[]) {
  const allowed = new Set<string>(planCodes);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        next(new UnauthorizedError('Authentication required before subscription check.'));
        return;
      }

      const snapshot: ActiveSubscriptionSnapshot | null =
        req.subscription !== undefined ? req.subscription : await getActiveSubscription(userId);

      req.subscription = snapshot;

      if (!snapshot || !allowed.has(snapshot.planCode)) {
        logger.warn('Subscription failure: plan not allowed', {
          path: req.path,
          method: req.method,
          userId,
          planCode: snapshot?.planCode ?? null,
          required: planCodes,
        });
        next(
          new ForbiddenError(`Active subscription plan required: ${planCodes.join(' | ')}.`, [
            { message: `Required plan: ${planCodes.join(' | ')}`, code: 'SUBSCRIPTION_REQUIRED' },
          ]),
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Requires an active subscription that includes a plan feature key.
 * Prefer feature checks over hard-coding plan names when gating product capabilities.
 */
export function requireFeature(...featureKeys: Array<PlanFeatureCode | string>) {
  const required = featureKeys;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        next(new UnauthorizedError('Authentication required before subscription check.'));
        return;
      }

      const snapshot: ActiveSubscriptionSnapshot | null =
        req.subscription !== undefined ? req.subscription : await getActiveSubscription(userId);

      req.subscription = snapshot;

      if (!snapshot) {
        next(
          new ForbiddenError('An active subscription is required for this resource.', [
            { message: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' },
          ]),
        );
        return;
      }

      const hasFeature = required.some((key) => snapshot.featureKeys.includes(key));
      if (!hasFeature) {
        logger.warn('Subscription failure: feature not entitled', {
          path: req.path,
          method: req.method,
          userId,
          planCode: snapshot.planCode,
          required,
        });
        next(
          new ForbiddenError(`Subscription feature required: ${required.join(' | ')}.`, [
            {
              message: `Required feature: ${required.join(' | ')}`,
              code: 'SUBSCRIPTION_REQUIRED',
            },
          ]),
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Convenience: premium commercial tier only (plan code PREMIUM). */
export const requirePremiumPlan = requirePlan(PLAN_CODES.PREMIUM);

export type { ActiveSubscriptionSnapshot };
