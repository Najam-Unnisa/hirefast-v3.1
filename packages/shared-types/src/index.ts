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
 * Platform identity roles (RBAC).
 * Commercial access is NOT encoded here — see SubscriptionPlanCode.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
}

export type UserRoleValue = `${UserRole}`;

/**
 * Commercial subscription plan codes (single source of truth for paid access).
 * Independent of RBAC roles — new plans do not require new roles.
 */
export enum SubscriptionPlanCode {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
}

export type SubscriptionPlanCodeValue = `${SubscriptionPlanCode}`;

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
 * JWT access-token payload — identity only.
 * Do not put subscription tier in `role`.
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
