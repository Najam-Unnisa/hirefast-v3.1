import { createErrorResponse, createSuccessResponse } from '@hirefast/shared-utils';
import type { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation completed successfully.',
  statusCode = 200,
): Response {
  return res.status(statusCode).json(createSuccessResponse(data, message));
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors: { field?: string; message: string; code?: string }[] = [],
): Response {
  return res.status(statusCode).json(createErrorResponse(message, errors));
}
