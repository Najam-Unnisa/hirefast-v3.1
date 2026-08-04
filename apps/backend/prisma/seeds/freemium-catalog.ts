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

  const leadership = await prisma.assessment.upsert({
    where: { code: 'ADVANCED_LEADERSHIP' },
    update: {
      title: 'Advanced Leadership Communication',
      slug: 'advanced-leadership-communication',
      description: 'Premium deep-dive on leadership communication and stakeholder alignment.',
      instructions:
        'Answer as a people leader. Focus on clarity, influence, and stakeholder alignment.',
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
      instructions:
        'Answer as a people leader. Focus on clarity, influence, and stakeholder alignment.',
      status: 'PUBLISHED',
      accessTier: 'PREMIUM',
      durationMinutes: 25,
      passingScore: 70,
      isActive: true,
      categoryId: category.id,
      publishedAt: new Date(),
    },
  });

  const premiumQuestions = [
    {
      code: 'AL_01',
      prompt:
        'A stakeholder challenges your roadmap in a meeting. Which response best demonstrates leadership communication?',
      options: [
        {
          label: 'Defend the plan without acknowledging their concern',
          value: 'defend',
          isCorrect: false,
        },
        {
          label:
            'Acknowledge the concern, restate shared goals, and propose a clear next decision point',
          value: 'align',
          isCorrect: true,
        },
        { label: 'Defer entirely and avoid the topic', value: 'defer', isCorrect: false },
      ],
    },
    {
      code: 'AL_02',
      prompt: 'Which update format is most effective for an executive status message?',
      options: [
        {
          label: 'Outcome, risk, ask — in that order, with one clear decision needed',
          value: 'outcome',
          isCorrect: true,
        },
        {
          label: 'A chronological list of every activity this week',
          value: 'chrono',
          isCorrect: false,
        },
        { label: 'Only metrics without context', value: 'metrics', isCorrect: false },
      ],
    },
    {
      code: 'AL_03',
      prompt:
        'True or false: Effective leaders adapt message detail to the audience while keeping the core ask consistent.',
      options: [
        { label: 'True', value: 'true', isCorrect: true },
        { label: 'False', value: 'false', isCorrect: false },
      ],
      questionType: 'TRUE_FALSE' as const,
    },
    {
      code: 'AL_04',
      prompt:
        'Write two sentences giving constructive feedback to a teammate whose stakeholder update was unclear.',
      options: undefined,
      questionType: 'SHORT_TEXT' as const,
    },
    {
      code: 'AL_05',
      prompt: 'When aligning cross-functional teams, the strongest opening is usually:',
      options: [
        { label: 'Listing every disagreement first', value: 'disagree', isCorrect: false },
        {
          label: 'Naming the shared outcome and decision criteria before debating options',
          value: 'shared',
          isCorrect: true,
        },
        { label: 'Assigning blame for delays', value: 'blame', isCorrect: false },
      ],
    },
  ];

  for (const [index, definition] of premiumQuestions.entries()) {
    const question = await prisma.question.upsert({
      where: {
        assessmentId_code: {
          assessmentId: leadership.id,
          code: definition.code,
        },
      },
      update: {
        prompt: definition.prompt,
        questionType: definition.questionType ?? 'MULTIPLE_CHOICE',
        sortOrder: index + 1,
        points: definition.questionType === 'SHORT_TEXT' ? 2 : 1,
        isRequired: true,
        deletedAt: null,
      },
      create: {
        assessmentId: leadership.id,
        code: definition.code,
        prompt: definition.prompt,
        questionType: definition.questionType ?? 'MULTIPLE_CHOICE',
        sortOrder: index + 1,
        points: definition.questionType === 'SHORT_TEXT' ? 2 : 1,
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

  // eslint-disable-next-line no-console
  console.info('[seed] Freemium catalog assessments ready');
}
