import type { PrismaClient } from '@prisma/client';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@hirefast.local';

/**
 * Seeds a bootstrap admin user (Google OAuth — no password stored).
 * Admin signs in via Google once AuthIdentity is linked by the auth feature.
 */
export async function seedAdminUser(prisma: PrismaClient, adminRoleId: string): Promise<void> {
  const email = ADMIN_EMAIL.toLowerCase();

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      roleId: adminRoleId,
      status: 'ACTIVE',
      emailVerified: true,
    },
    create: {
      email,
      roleId: adminRoleId,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      firstName: 'HireFast',
      lastName: 'Admin',
      displayName: 'HireFast Admin',
      isComplete: true,
      completedAt: new Date(),
    },
    create: {
      userId: user.id,
      firstName: 'HireFast',
      lastName: 'Admin',
      displayName: 'HireFast Admin',
      isComplete: true,
      completedAt: new Date(),
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
    },
  });

  // eslint-disable-next-line no-console
  console.info(`[seed] Admin user ready (${email})`);
}
