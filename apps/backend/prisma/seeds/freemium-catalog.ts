import type { PrismaClient } from '@prisma/client';

/**
 * Additional freemium catalog entries: one more FREE assessment + one PREMIUM locked card.
 */
export async function seedFreemiumCatalog(prisma: PrismaClient): Promise<void> {
  const category = await prisma.assessmentCategory.findFirst({
    where: { code: 'BEHAVIORAL' },
  });
  if (!category) {
    console.warn('[seed] Skipping freemium catalog — BEHAVIORAL category missing');
    return;
  }

  const freeInterview = await prisma.assessment.upsert({
    where: { code: 'INTERVIEW_BASICS' },
    update: {
      title: 'Interview Basics',
      slug: 'interview-basics',
      description: 'Practice foundational interview communication for freemium candidates.',
      instructions: 'Answer each prompt thoughtfully. You can resume if interrupted.',
      status: 'PUBLISHED',
      accessTier: 'FREE',
      durationMinutes: 12,
      passingScore: 60,
      isActive: true,
      publishedAt: new Date(),
      deletedAt: null,
    },
    create: {
      code: 'INTERVIEW_BASICS',
      slug: 'interview-basics',
      title: 'Interview Basics',
      description: 'Practice foundational interview communication for freemium candidates.',
      instructions: 'Answer each prompt thoughtfully. You can resume if interrupted.',
      status: 'PUBLISHED',
      accessTier: 'FREE',
      durationMinutes: 12,
      passingScore: 60,
      isActive: true,
      categoryId: category.id,
      publishedAt: new Date(),
    },
  });

  const questions = [
    {
      code: 'IB_01',
      prompt: 'Which answer best introduces yourself in a professional interview?',
      options: [
        { label: 'A long life story with unrelated details', value: 'long', isCorrect: false },
        {
          label: 'A concise summary of role, strengths, and relevant experience',
          value: 'concise',
          isCorrect: true,
        },
        { label: 'Only your hobbies', value: 'hobbies', isCorrect: false },
      ],
    },
    {
      code: 'IB_02',
      prompt: 'When you do not know an answer, the strongest response is to:',
      options: [
        { label: 'Invent a confident answer', value: 'invent', isCorrect: false },
        {
          label: 'Acknowledge the gap and outline how you would find out',
          value: 'acknowledge',
          isCorrect: true,
        },
        { label: 'Change the topic immediately', value: 'change', isCorrect: false },
      ],
    },
    {
      code: 'IB_03',
      prompt: 'Describe one accomplishment using a clear situation → action → result structure.',
      options: undefined,
      questionType: 'SHORT_TEXT' as const,
    },
  ];

  for (const [index, definition] of questions.entries()) {
    const question = await prisma.question.upsert({
      where: {
        assessmentId_code: {
          assessmentId: freeInterview.id,
          code: definition.code,
        },
      },
      update: {
        prompt: definition.prompt,
        questionType: definition.questionType ?? 'MULTIPLE_CHOICE',
        sortOrder: index + 1,
        points: 1,
        isRequired: true,
        deletedAt: null,
      },
      create: {
        assessmentId: freeInterview.id,
        code: definition.code,
        prompt: definition.prompt,
        questionType: definition.questionType ?? 'MULTIPLE_CHOICE',
        sortOrder: index + 1,
        points: 1,
        isRequired: true,
      },
    });

    if (definition.options) {
      await prisma.questionOption.deleteMany({ where: { questionId: question.id } });
      await prisma.questionOption.createMany({
        data: definition.options.map((option, optionIndex) => ({
          questionId: question.id,
          label: option.label,
          value: option.value,
          isCorrect: option.isCorrect,
          sortOrder: optionIndex + 1,
          points: option.isCorrect ? 1 : 0,
        })),
      });
    }
  }

  await prisma.assessment.upsert({
    where: { code: 'ADVANCED_LEADERSHIP' },
    update: {
      title: 'Advanced Leadership Communication',
      slug: 'advanced-leadership-communication',
      description: 'Premium deep-dive on leadership communication and stakeholder alignment.',
      status: 'PUBLISHED',
      accessTier: 'PREMIUM',
      durationMinutes: 25,
      passingScore: 70,
      isActive: true,
      publishedAt: new Date(),
      deletedAt: null,
    },
    create: {
      code: 'ADVANCED_LEADERSHIP',
      slug: 'advanced-leadership-communication',
      title: 'Advanced Leadership Communication',
      description: 'Premium deep-dive on leadership communication and stakeholder alignment.',
      instructions: 'Premium subscribers only.',
      status: 'PUBLISHED',
      accessTier: 'PREMIUM',
      durationMinutes: 25,
      passingScore: 70,
      isActive: true,
      categoryId: category.id,
      publishedAt: new Date(),
    },
  });

  // eslint-disable-next-line no-console
  console.info('[seed] Freemium catalog assessments ready');
}
