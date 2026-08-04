/**
 * HireFast foundational seed — platform bootstrap only.
 * Does NOT seed candidate assessment data.
 */
import { PrismaClient } from '@prisma/client';
import { seedRolesAndPermissions } from './seeds/roles-permissions';
import { seedAdminUser } from './seeds/admin-user';
import { seedPlatformSettings } from './seeds/platform-settings';
import { seedAssessmentTaxonomy } from './seeds/assessment-taxonomy';
import { seedGuestAssessment } from './seeds/guest-assessment';
import { seedGamification } from './seeds/gamification';
import { seedSubscriptionPlans } from './seeds/subscription-plans';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.info('[seed] Starting HireFast foundational seed...');

  const roles = await seedRolesAndPermissions(prisma);
  await seedAdminUser(prisma, roles.adminRoleId);
  await seedPlatformSettings(prisma);
  await seedAssessmentTaxonomy(prisma);
  await seedGuestAssessment(prisma);
  await seedGamification(prisma);
  await seedSubscriptionPlans(prisma);

  // eslint-disable-next-line no-console
  console.info('[seed] Foundational seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] Failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
