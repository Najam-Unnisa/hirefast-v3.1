import type {
  ApiErrorDetail,
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginatedMeta,
  PaginatedResult,
  PaginationParams,
} from '@hirefast/shared-types';

export function createSuccessResponse<T>(
  data: T,
  message = 'Operation completed successfully.',
): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function createErrorResponse(
  message: string,
  errors: ApiErrorDetail[] = [],
): ApiErrorResponse {
  return {
    success: false,
    message,
    errors,
  };
}

export function normalizePagination(
  params: PaginationParams = {},
): Required<Pick<PaginationParams, 'page' | 'limit' | 'sortOrder'>> &
  Pick<PaginationParams, 'sortBy'> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const sortOrder = params.sortOrder === 'desc' ? 'desc' : 'asc';

  return {
    page,
    limit,
    sortBy: params.sortBy,
    sortOrder,
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const meta: PaginatedMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  return { items, meta };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export * from './date';
export * from './constants';
