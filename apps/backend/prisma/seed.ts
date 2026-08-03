/**
 * Prisma seed — foundation only.
 * No business data is seeded in project initialization.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.schemaMeta.upsert({
    where: { key: 'schema_version' },
    update: { value: '1.0.0' },
    create: {
      key: 'schema_version',
      value: '1.0.0',
    },
  });

  // eslint-disable-next-line no-console
  console.info('[seed] Schema meta initialized (foundation only).');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] Failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
