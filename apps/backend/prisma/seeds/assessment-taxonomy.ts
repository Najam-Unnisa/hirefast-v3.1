import type { PrismaClient } from '@prisma/client';

export async function seedAssessmentTaxonomy(prisma: PrismaClient): Promise<void> {
  const categories = [
    {
      code: 'COMMUNICATION',
      name: 'Communication',
      description: 'General and professional communication assessments',
      sortOrder: 1,
    },
    {
      code: 'TECHNICAL',
      name: 'Technical',
      description: 'Technical and domain skill assessments',
      sortOrder: 2,
    },
    {
      code: 'BEHAVIORAL',
      name: 'Behavioral',
      description: 'Behavioral and soft-skill assessments',
      sortOrder: 3,
    },
    {
      code: 'CAREER_READINESS',
      name: 'Career Readiness',
      description: 'Employability and interview readiness assessments',
      sortOrder: 4,
    },
  ] as const;

  for (const category of categories) {
    await prisma.assessmentCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    });
  }

  const skills = [
    {
      code: 'VERBAL_COMMUNICATION',
      name: 'Verbal Communication',
      domain: 'COMMUNICATION',
      description: 'Clarity and structure in spoken communication',
    },
    {
      code: 'WRITTEN_COMMUNICATION',
      name: 'Written Communication',
      domain: 'COMMUNICATION',
      description: 'Clarity and professionalism in writing',
    },
    {
      code: 'ACTIVE_LISTENING',
      name: 'Active Listening',
      domain: 'COMMUNICATION',
      description: 'Understanding and responding appropriately',
    },
    {
      code: 'PROBLEM_SOLVING',
      name: 'Problem Solving',
      domain: 'COGNITIVE',
      description: 'Analyzing problems and proposing solutions',
    },
    {
      code: 'TEAMWORK',
      name: 'Teamwork',
      domain: 'BEHAVIORAL',
      description: 'Collaboration and interpersonal effectiveness',
    },
    {
      code: 'INTERVIEW_READINESS',
      name: 'Interview Readiness',
      domain: 'CAREER',
      description: 'Preparedness for professional interviews',
    },
  ] as const;

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { code: skill.code },
      update: {
        name: skill.name,
        description: skill.description,
        domain: skill.domain,
        isActive: true,
      },
      create: {
        ...skill,
        isActive: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.info('[seed] Assessment categories and skills ready');
}
