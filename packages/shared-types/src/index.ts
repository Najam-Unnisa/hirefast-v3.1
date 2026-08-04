/**
 * Shared API response envelope used across HireFast clients and services.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: ApiErrorDetail[];
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Platform roles (RBAC). Authorization decisions must occur on the backend.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  GUEST = 'GUEST',
  FREEMIUM = 'FREEMIUM',
  PREMIUM = 'PREMIUM',
}

export type UserRoleValue = `${UserRole}`;

/**
 * Pagination contracts shared by list endpoints.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginatedMeta;
}

/**
 * Health check payload.
 */
export type ServiceStatus = 'up' | 'down' | 'degraded';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  environment: string;
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    redis: ServiceStatus;
  };
  version: string;
}

/**
 * JWT token payload shape (non-sensitive claims only).
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRoleValue;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export * from './api';
