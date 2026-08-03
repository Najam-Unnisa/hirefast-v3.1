import type { NextFunction, Request, Response } from 'express';
import { createErrorResponse } from '@hirefast/shared-utils';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json(
      createErrorResponse(`Route ${req.method} ${req.originalUrl} not found.`, [
        { message: 'Not found', code: 'NOT_FOUND' },
      ]),
    );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Operational flag false for AppError', { error: err });
    }

    res.status(err.statusCode).json(createErrorResponse(err.message, err.errors));
    return;
  }

  logger.error('Unhandled server error', { error: err });

  const message = env.isProduction
    ? 'An unexpected error occurred.'
    : err instanceof Error
      ? err.message
      : 'An unexpected error occurred.';

  res
    .status(500)
    .json(
      createErrorResponse(message, [{ message: 'Internal server error', code: 'INTERNAL_ERROR' }]),
    );
}
