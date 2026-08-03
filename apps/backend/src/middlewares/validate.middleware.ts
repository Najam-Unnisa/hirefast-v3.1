import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

type RequestTarget = 'body' | 'query' | 'params';

/**
 * Validates request body, query, or params against a Zod schema.
 */
export function validateRequest(schema: ZodSchema, target: RequestTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || target,
        message: issue.message,
        code: issue.code,
      }));
      next(new ValidationError('Validation failed.', errors));
      return;
    }

    req[target] = result.data;
    next();
  };
}
