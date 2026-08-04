import type { UserRoleValue } from '@hirefast/shared-types';

/**
 * Identity roles for RBAC — not commercial tiers.
 * Premium access is determined by subscription plans/features.
 */
export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  GUEST: 'GUEST',
} as const satisfies Record<string, UserRoleValue>;

export const ALL_ROLES: UserRoleValue[] = Object.values(ROLES);

/** Registered (non-guest) candidate identity */
export const CANDIDATE_ROLES: UserRoleValue[] = [ROLES.USER];

/** Any authenticated human identity including guest */
export const AUTHENTICATED_ROLES: UserRoleValue[] = [ROLES.ADMIN, ROLES.USER, ROLES.GUEST];
