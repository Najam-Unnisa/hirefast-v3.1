import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload, UserRoleValue } from '@hirefast/shared-types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { extractBearerToken, verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Authentication middleware — verifies JWT access token.
 * Does not implement login; only reusable auth infrastructure.
 */
export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedError('Authentication required.');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication — attaches user when token present, otherwise continues.
 */
export function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      req.user = verifyAccessToken(token);
    }
    next();
  } catch {
    next();
  }
}

/**
 * Authorization middleware — requires authenticated user.
 */
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required.'));
    return;
  }
  next();
}

/**
 * RBAC middleware — restricts access to allowed roles.
 * Authorization decisions always occur on the backend.
 */
export function authorize(...allowedRoles: UserRoleValue[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('Permission failure: unauthenticated access attempt', {
        path: req.path,
        method: req.method,
      });
      next(new UnauthorizedError('Authentication required.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Permission failure: insufficient role', {
        path: req.path,
        method: req.method,
        role: req.user.role,
        required: allowedRoles,
      });
      next(new ForbiddenError('You do not have permission to perform this action.'));
      return;
    }

    next();
  };
}
