import type { UserRoleValue } from '@hirefast/shared-types';

export const ROLES = {
  ADMIN: 'ADMIN',
  GUEST: 'GUEST',
  FREEMIUM: 'FREEMIUM',
  PREMIUM: 'PREMIUM',
} as const satisfies Record<string, UserRoleValue>;

export const ALL_ROLES: UserRoleValue[] = Object.values(ROLES);

export const REGISTERED_ROLES: UserRoleValue[] = [ROLES.FREEMIUM, ROLES.PREMIUM];
