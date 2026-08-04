/**
 * Shared API contract types for HireFast v1.
 * Contract only — no runtime behavior.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiAuthClass = 'public' | 'authenticated' | 'guest' | 'user' | 'admin';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESULTS_LOCKED'
  | 'PREMIUM_REQUIRED'
  | 'SUBSCRIPTION_REQUIRED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'EVALUATION_PENDING'
  | 'INTERNAL_ERROR';

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
}

export interface CurrentUserDto {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'GUEST';
  status: string;
  emailVerified: boolean;
  profile: {
    isComplete: boolean;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  /** Commercial access — from subscription service, not RBAC role */
  subscription?: {
    planCode: string;
    status: string;
  } | null;
}

export interface ProfileDto {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  phone?: string | null;
  headline?: string | null;
  bio?: string | null;
  locale?: string | null;
  timezone?: string | null;
  countryCode?: string | null;
  isComplete: boolean;
  completedAt?: string | null;
}

export interface AssessmentDto {
  id: string;
  code: string;
  slug: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  status: string;
  accessTier: 'FREE' | 'PREMIUM';
  durationMinutes?: number | null;
  categoryId: string;
  categoryName?: string;
}

export interface AttemptDto {
  id: string;
  assessmentId: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  submittedAt?: string | null;
  resultsLocked: boolean;
  assessmentTitle?: string;
}

export interface JrsDto {
  overallScore: number;
  band?: string | null;
  version: string;
  calculatedAt: string;
  skillScores: Array<{
    skillId: string;
    skillCode: string;
    skillName: string;
    score: number;
    weight: number;
  }>;
}

export interface DashboardDto {
  profile: { isComplete: boolean; displayName?: string | null };
  jrs?: { overallScore: number; band?: string; calculatedAt: string } | null;
  assessments: { completed: number; inProgress: number; available: number };
  latestAttempt?: AttemptDto | null;
  gamification: {
    totalXp: number;
    level: { levelNumber: number; name: string };
    currentStreak: number;
    badgesEarned: number;
  };
  subscription: { planCode: string; status: string };
  resultsLocked: boolean;
}

export interface ContractPaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  featureEnabled?: boolean;
}

export interface AssessmentPage {
  items: AssessmentDto[];
  meta: ContractPaginatedMeta;
}

export interface AttemptPage {
  items: AttemptDto[];
  meta: ContractPaginatedMeta;
}
