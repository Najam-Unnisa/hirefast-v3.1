import type { PrismaClient, QuestionType } from '@prisma/client';

type SeedQuestion = {
  code: string;
  prompt: string;
  questionType: QuestionType;
  sortOrder: number;
  points: number;
  options?: Array<{
    label: string;
    value: string;
    isCorrect: boolean;
  }>;
};

const QUESTIONS: SeedQuestion[] = [
  {
    code: 'GC_01',
    prompt: 'Which response best demonstrates active listening during a workplace conversation?',
    questionType: 'MULTIPLE_CHOICE',
    sortOrder: 1,
    points: 1,
    options: [
      { label: 'Interrupt to offer a solution immediately', value: 'interrupt', isCorrect: false },
      {
        label: 'Summarize what you heard and ask a clarifying question',
        value: 'summarize',
        isCorrect: true,
      },
      {
        label: 'Wait silently without acknowledging the speaker',
        value: 'silent',
        isCorrect: false,
      },
      {
        label: 'Change the subject to a related experience',
        value: 'change_subject',
        isCorrect: false,
      },
    ],
  },
  {
    code: 'GC_02',
    prompt: 'What is the clearest subject line for an email requesting approval by Friday?',
    questionType: 'MULTIPLE_CHOICE',
    sortOrder: 2,
    points: 1,
    options: [
      { label: 'Hello', value: 'hello', isCorrect: false },
      { label: 'Important information', value: 'important', isCorrect: false },
      {
        label: 'Approval needed by Friday: Q3 campaign budget',
        value: 'specific',
        isCorrect: true,
      },
      { label: 'Please read when possible', value: 'please_read', isCorrect: false },
    ],
  },
  {
    code: 'GC_03',
    prompt: 'Using concise language generally makes workplace communication easier to understand.',
    questionType: 'TRUE_FALSE',
    sortOrder: 3,
    points: 1,
    options: [
      { label: 'True', value: 'true', isCorrect: true },
      { label: 'False', value: 'false', isCorrect: false },
    ],
  },
  {
    code: 'GC_04',
    prompt:
      'Write one sentence that professionally asks a colleague to clarify an unclear deadline.',
    questionType: 'SHORT_TEXT',
    sortOrder: 4,
    points: 2,
  },
  {
    code: 'GC_05',
    prompt: 'Which opening is most appropriate when giving constructive feedback?',
    questionType: 'MULTIPLE_CHOICE',
    sortOrder: 5,
    points: 1,
    options: [
      { label: 'You always get this wrong.', value: 'accusation', isCorrect: false },
      {
        label:
          'I noticed the report was submitted after the deadline; can we discuss what happened?',
        value: 'observation',
        isCorrect: true,
      },
      { label: 'Everyone is unhappy with your work.', value: 'generalization', isCorrect: false },
      { label: 'This should be obvious by now.', value: 'dismissive', isCorrect: false },
    ],
  },
  {
    code: 'GC_06',
    prompt: 'Nonverbal cues can affect how a spoken message is interpreted.',
    questionType: 'TRUE_FALSE',
    sortOrder: 6,
    points: 1,
    options: [
      { label: 'True', value: 'true', isCorrect: true },
      { label: 'False', value: 'false', isCorrect: false },
    ],
  },
  {
    code: 'GC_07',
    prompt: 'Briefly describe how you would confirm that an audience understood your instructions.',
    questionType: 'SHORT_TEXT',
    sortOrder: 7,
    points: 2,
  },
  {
    code: 'GC_08',
    prompt: 'Which message is most suitable for a professional chat channel?',
    questionType: 'MULTIPLE_CHOICE',
    sortOrder: 8,
    points: 1,
    options: [
      { label: 'Need this ASAP!!!', value: 'asap', isCorrect: false },
      {
        label: 'Could you review the attached draft by 3 PM? It will unblock tomorrow’s launch.',
        value: 'clear_request',
        isCorrect: true,
      },
      { label: 'Why have you not replied?', value: 'confrontational', isCorrect: false },
      { label: 'Call me.', value: 'vague', isCorrect: false },
    ],
  },
];

export async function seedGuestAssessment(prisma: PrismaClient): Promise<void> {
  const category = await prisma.assessmentCategory.findUniqueOrThrow({
    where: { code: 'COMMUNICATION' },
  });

  const assessment = await prisma.assessment.upsert({
    where: { code: 'GENERAL_COMMUNICATION' },
    update: {
      categoryId: category.id,
      slug: 'general-communication',
      title: 'General Communication',
      description: 'A short assessment of everyday professional communication skills.',
      instructions: 'Answer all questions. Your results unlock after you complete your profile.',
      status: 'PUBLISHED',
      accessTier: 'FREE',
      durationMinutes: 20,
      passingScore: 60,
      maxAttempts: 1,
      isActive: true,
      publishedAt: new Date(),
      deletedAt: null,
    },
    create: {
      categoryId: category.id,
      code: 'GENERAL_COMMUNICATION',
      slug: 'general-communication',
      title: 'General Communication',
      description: 'A short assessment of everyday professional communication skills.',
      instructions: 'Answer all questions. Your results unlock after you complete your profile.',
      status: 'PUBLISHED',
      accessTier: 'FREE',
      durationMinutes: 20,
      passingScore: 60,
      maxAttempts: 1,
      isActive: true,
      publishedAt: new Date(),
    },
  });

  const skills = await prisma.skill.findMany({
    where: {
      code: {
        in: ['VERBAL_COMMUNICATION', 'WRITTEN_COMMUNICATION', 'ACTIVE_LISTENING'],
      },
    },
  });

  for (const skill of skills) {
    await prisma.assessmentSkill.upsert({
      where: {
        assessmentId_skillId: {
          assessmentId: assessment.id,
          skillId: skill.id,
        },
      },
      update: { weight: 1 },
      create: {
        assessmentId: assessment.id,
        skillId: skill.id,
        weight: 1,
      },
    });
  }

  for (const definition of QUESTIONS) {
    const question = await prisma.question.upsert({
      where: {
        assessmentId_code: {
          assessmentId: assessment.id,
          code: definition.code,
        },
      },
      update: {
        prompt: definition.prompt,
        questionType: definition.questionType,
        sortOrder: definition.sortOrder,
        points: definition.points,
        isRequired: true,
        deletedAt: null,
      },
      create: {
        assessmentId: assessment.id,
        code: definition.code,
        prompt: definition.prompt,
        questionType: definition.questionType,
        sortOrder: definition.sortOrder,
        points: definition.points,
        isRequired: true,
      },
    });

    await prisma.questionOption.deleteMany({ where: { questionId: question.id } });
    if (definition.options?.length) {
      await prisma.questionOption.createMany({
        data: definition.options.map((option, index) => ({
          questionId: question.id,
          ...option,
          sortOrder: index + 1,
        })),
      });
    }
  }

  // eslint-disable-next-line no-console
  console.info('[seed] Guest General Communication assessment ready');
}
