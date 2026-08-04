import type { ApiErrorDetail } from '@hirefast/shared-types';
import { HTTP_STATUS } from '@hirefast/shared-utils';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors: ApiErrorDetail[] = [],
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request.', errors: ApiErrorDetail[] = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized.', errors: ApiErrorDetail[] = []) {
    super(message, HTTP_STATUS.UNAUTHORIZED, errors);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden.', errors: ApiErrorDetail[] = []) {
    super(message, HTTP_STATUS.FORBIDDEN, errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.', errors: ApiErrorDetail[] = []) {
    super(message, HTTP_STATUS.NOT_FOUND, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict.', errors: ApiErrorDetail[] = []) {
    super(message, HTTP_STATUS.CONFLICT, errors);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed.', errors: ApiErrorDetail[] = []) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, errors);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests.', errors: ApiErrorDetail[] = []) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, errors);
  }
}
