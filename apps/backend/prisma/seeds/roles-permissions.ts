import type { PrismaClient } from '@prisma/client';

export interface SeededRoles {
  adminRoleId: string;
  guestRoleId: string;
  freemiumRoleId: string;
  premiumRoleId: string;
}

const PERMISSIONS = [
  { code: 'platform:settings:read', displayName: 'Read platform settings', module: 'platform' },
  { code: 'platform:settings:write', displayName: 'Write platform settings', module: 'platform' },
  { code: 'users:read', displayName: 'Read users', module: 'users' },
  { code: 'users:manage', displayName: 'Manage users', module: 'users' },
  { code: 'assessments:read', displayName: 'Read assessments', module: 'assessments' },
  { code: 'assessments:manage', displayName: 'Manage assessments', module: 'assessments' },
  { code: 'questions:manage', displayName: 'Manage questions', module: 'assessments' },
  { code: 'attempts:read', displayName: 'Read assessment attempts', module: 'assessments' },
  { code: 'reports:read', displayName: 'Read reports', module: 'reports' },
  { code: 'reports:manage', displayName: 'Manage reports', module: 'reports' },
  { code: 'hr_reviews:manage', displayName: 'Manage HR reviews', module: 'hr' },
  { code: 'analytics:read', displayName: 'Read analytics', module: 'analytics' },
  { code: 'subscriptions:manage', displayName: 'Manage subscriptions', module: 'billing' },
  {
    code: 'gamification:manage',
    displayName: 'Manage gamification config',
    module: 'gamification',
  },
] as const;

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map((p) => p.code),
  GUEST: ['assessments:read'],
  FREEMIUM: ['assessments:read', 'attempts:read', 'reports:read'],
  PREMIUM: ['assessments:read', 'attempts:read', 'reports:read'],
};

export async function seedRolesAndPermissions(prisma: PrismaClient): Promise<SeededRoles> {
  const roleDefs = [
    {
      name: 'ADMIN',
      displayName: 'Admin',
      description: 'Full platform administration',
      isSystem: true,
    },
    {
      name: 'GUEST',
      displayName: 'Guest User',
      description: 'Google-authenticated guest with locked results until profile completion',
      isSystem: true,
    },
    {
      name: 'FREEMIUM',
      displayName: 'Registered User (Freemium)',
      description: 'Registered free-tier candidate',
      isSystem: true,
    },
    {
      name: 'PREMIUM',
      displayName: 'Registered User (Premium)',
      description: 'Registered premium candidate',
      isSystem: true,
    },
  ] as const;

  const roleIds: Record<string, string> = {};

  for (const role of roleDefs) {
    const saved = await prisma.role.upsert({
      where: { name: role.name },
      update: {
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: role,
    });
    roleIds[role.name] = saved.id;
  }

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        displayName: permission.displayName,
        module: permission.module,
      },
      create: permission,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permissionByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  for (const [roleName, codes] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleIds[roleName];
    for (const code of codes) {
      const permissionId = permissionByCode.get(code);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.info('[seed] Roles and permissions ready');

  return {
    adminRoleId: roleIds.ADMIN,
    guestRoleId: roleIds.GUEST,
    freemiumRoleId: roleIds.FREEMIUM,
    premiumRoleId: roleIds.PREMIUM,
  };
}
