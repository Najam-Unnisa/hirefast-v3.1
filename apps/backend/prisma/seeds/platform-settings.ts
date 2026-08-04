import type { PrismaClient, Prisma } from '@prisma/client';

const SETTINGS: Array<{
  key: string;
  value: Prisma.InputJsonValue;
  description: string;
  isPublic: boolean;
}> = [
  {
    key: 'schema_version',
    value: '1.0.0',
    description: 'HireFast database schema version',
    isPublic: false,
  },
  {
    key: 'app.name',
    value: 'HireFast',
    description: 'Application display name',
    isPublic: true,
  },
  {
    key: 'app.support_email',
    value: 'support@hirefast.local',
    description: 'Support contact email',
    isPublic: true,
  },
  {
    key: 'assessments.guest_assessment_code',
    value: 'GENERAL_COMMUNICATION',
    description: 'Default assessment available to guest users',
    isPublic: false,
  },
  {
    key: 'assessments.lock_results_until_profile_complete',
    value: true,
    description: 'Lock guest/incomplete-profile results until registration is finished',
    isPublic: false,
  },
  {
    key: 'jrs.version',
    value: '1.0.0',
    description: 'Active Job Readiness Score algorithm version',
    isPublic: false,
  },
  {
    key: 'gamification.daily_streak_enabled',
    value: true,
    description: 'Enable daily streak tracking',
    isPublic: false,
  },
  {
    key: 'notifications.default_channels',
    value: ['IN_APP', 'EMAIL'],
    description: 'Default notification channels',
    isPublic: false,
  },
];

export async function seedPlatformSettings(prisma: PrismaClient): Promise<void> {
  for (const setting of SETTINGS) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        description: setting.description,
        isPublic: setting.isPublic,
      },
      create: setting,
    });
  }

  // eslint-disable-next-line no-console
  console.info('[seed] Platform settings ready');
}
