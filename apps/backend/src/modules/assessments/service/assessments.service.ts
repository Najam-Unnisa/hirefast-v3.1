import type { Prisma } from '@prisma/client';
import type { UserRoleValue } from '@hirefast/shared-types';
import { prisma } from '../../../config/database';
import { ROLES } from '../../../constants/roles';
import { PLAN_FEATURES } from '../../../constants/subscription';
import { getQueue, QUEUE_NAMES } from '../../../jobs';
import { trackEvent } from '../../../services/analytics.service';
import { userHasFeature } from '../../../services/subscription-access.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../utils/errors';

const GUEST_ASSESSMENT_CODE = 'GENERAL_COMMUNICATION';
const RESULTS_LOCKED_ERRORS = [
  {
    code: 'RESULTS_LOCKED',
    message: 'Complete your profile to unlock assessment results.',
  },
];
const PREMIUM_REQUIRED_ERRORS = [
  {
    code: 'PREMIUM_REQUIRED',
    message: 'An active Premium subscription is required for this assessment.',
  },
];

export interface SaveResponseInput {
  questionId: string;
  selectedOptionId?: string | null;
  textAnswer?: string | null;
  numericAnswer?: number | string | null;
  rawPayload?: Prisma.InputJsonValue;
}

export class AssessmentsService {
  async listAssessments(role: UserRoleValue, userId: string) {
    if (role === ROLES.GUEST) {
      return prisma.assessment.findMany({
        where: {
          status: 'PUBLISHED',
          accessTier: 'FREE',
          isActive: true,
          deletedAt: null,
          code: GUEST_ASSESSMENT_CODE,
        },
        select: catalogSelect,
        orderBy: { publishedAt: 'desc' },
      });
    }

    const hasPremium = await userHasFeature(userId, PLAN_FEATURES.ASSESSMENTS_PREMIUM);
    const assessments = await prisma.assessment.findMany({
      where: {
        status: 'PUBLISHED',
        isActive: true,
        deletedAt: null,
      },
      select: catalogSelect,
      orderBy: [{ accessTier: 'asc' }, { publishedAt: 'desc' }],
    });

    return assessments.map((assessment) => ({
      ...assessment,
      locked: assessment.accessTier === 'PREMIUM' && !hasPremium,
      upgradeRequired: assessment.accessTier === 'PREMIUM' && !hasPremium,
    }));
  }

  async getAssessmentById(id: string, role: UserRoleValue, userId: string) {
    return this.getVisibleAssessment({ id }, role, userId);
  }

  async getAssessmentBySlug(slug: string, role: UserRoleValue, userId: string) {
    return this.getVisibleAssessment({ slug }, role, userId);
  }

  async listMyAttempts(
    userId: string,
    options: { page?: number; limit?: number; status?: string } = {},
  ) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(options.status ? { status: options.status as never } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.assessmentAttempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          assessment: {
            select: { id: true, title: true, slug: true, code: true, accessTier: true },
          },
          evaluation: {
            select: { percentage: true, passed: true, status: true },
          },
          jobReadinessScore: {
            select: { overallScore: true, band: true },
          },
        },
      }),
      prisma.assessmentAttempt.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        assessmentId: item.assessmentId,
        attemptNumber: item.attemptNumber,
        status: item.status,
        startedAt: item.startedAt,
        submittedAt: item.submittedAt,
        completedAt: item.completedAt,
        resultsLocked: item.resultsLocked,
        assessmentTitle: item.assessment.title,
        assessmentSlug: item.assessment.slug,
        accessTier: item.assessment.accessTier,
        score: item.evaluation?.percentage != null ? Number(item.evaluation.percentage) : null,
        jrs: item.jobReadinessScore
          ? {
              overallScore: Number(item.jobReadinessScore.overallScore),
              band: item.jobReadinessScore.band,
            }
          : null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async startAttempt(assessmentId: string, userId: string, role: UserRoleValue) {
    const assessment = await this.getVisibleAssessment({ id: assessmentId }, role, userId);
    if (role === ROLES.GUEST && assessment.code !== GUEST_ASSESSMENT_CODE) {
      throw new ForbiddenError('Guests can only take the General Communication assessment.');
    }
    if (assessment.accessTier === 'PREMIUM') {
      const allowed = await userHasFeature(userId, PLAN_FEATURES.ASSESSMENTS_PREMIUM);
      if (!allowed) {
        throw new ForbiddenError(
          'Premium subscription required for this assessment.',
          PREMIUM_REQUIRED_ERRORS,
        );
      }
    }

    const inProgress = await prisma.assessmentAttempt.findFirst({
      where: { userId, assessmentId, status: 'IN_PROGRESS' },
    });
    if (inProgress) {
      trackEvent({
        eventName: 'assessment.resumed',
        userId,
        properties: { assessmentId, attemptId: inProgress.id },
      });
      return inProgress;
    }

    if (role === ROLES.GUEST) {
      const completedAttempt = await prisma.assessmentAttempt.findFirst({
        where: {
          userId,
          assessmentId,
          status: { in: ['SUBMITTED', 'COMPLETED'] },
        },
      });
      if (completedAttempt) {
        throw new ForbiddenError('Guest assessment retakes are not allowed.', [
          {
            code: 'GUEST_RETAKE_NOT_ALLOWED',
            message: 'Complete your profile before taking another assessment.',
          },
        ]);
      }
    }

    const latestAttempt = await prisma.assessmentAttempt.aggregate({
      where: { userId, assessmentId },
      _max: { attemptNumber: true },
    });

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        userId,
        assessmentId,
        attemptNumber: (latestAttempt._max.attemptNumber ?? 0) + 1,
        resultsLocked: role === ROLES.GUEST,
      },
    });

    trackEvent({
      eventName: 'assessment.started',
      userId,
      properties: {
        assessmentId,
        attemptId: attempt.id,
        role,
        accessTier: assessment.accessTier,
      },
    });
    if (assessment.accessTier === 'PREMIUM') {
      trackEvent({
        eventName: 'premium.assessment_started',
        userId,
        properties: { assessmentId, attemptId: attempt.id },
      });
    }
    return attempt;
  }

  async getAttempt(attemptId: string, userId: string) {
    const attempt = await this.requireOwnedAttempt(attemptId, userId);
    const responses = await prisma.attemptResponse.findMany({
      where: { attemptId },
      select: {
        id: true,
        questionId: true,
        selectedOptionId: true,
        textAnswer: true,
        numericAnswer: true,
        answeredAt: true,
      },
    });
    return { ...attempt, responses };
  }

  async getQuestions(attemptId: string, userId: string) {
    const attempt = await this.requireOwnedAttempt(attemptId, userId);
    return prisma.question.findMany({
      where: {
        assessmentId: attempt.assessmentId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        prompt: true,
        questionType: true,
        sortOrder: true,
        points: true,
        isRequired: true,
        timeLimitSec: true,
        metadata: true,
        options: {
          select: {
            id: true,
            label: true,
            value: true,
            sortOrder: true,
            points: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async saveResponse(attemptId: string, userId: string, input: SaveResponseInput) {
    const attempt = await this.requireOwnedAttempt(attemptId, userId);
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestError('Responses can only be saved while an attempt is in progress.');
    }

    const question = await prisma.question.findFirst({
      where: {
        id: input.questionId,
        assessmentId: attempt.assessmentId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!question) {
      throw new NotFoundError('Question not found for this assessment.');
    }

    if (input.selectedOptionId) {
      const option = await prisma.questionOption.findFirst({
        where: {
          id: input.selectedOptionId,
          questionId: input.questionId,
        },
        select: { id: true },
      });
      if (!option) {
        throw new BadRequestError('The selected option does not belong to this question.');
      }
    }

    const data = {
      selectedOptionId: input.selectedOptionId ?? null,
      textAnswer: input.textAnswer ?? null,
      numericAnswer: input.numericAnswer ?? null,
      ...(input.rawPayload !== undefined ? { rawPayload: input.rawPayload } : {}),
      answeredAt: new Date(),
    };

    const response = await prisma.attemptResponse.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: input.questionId,
        },
      },
      update: data,
      create: {
        attemptId,
        questionId: input.questionId,
        ...data,
      },
    });

    trackEvent({
      eventName: 'assessment.auto_saved',
      userId,
      properties: { attemptId, questionId: input.questionId },
    });
    return response;
  }

  async saveResponses(attemptId: string, userId: string, responses: SaveResponseInput[]) {
    if (!Array.isArray(responses) || responses.length === 0) {
      throw new BadRequestError('At least one response is required.');
    }
    return Promise.all(responses.map((response) => this.saveResponse(attemptId, userId, response)));
  }

  async submitAttempt(attemptId: string, userId: string, role: UserRoleValue) {
    await this.requireOwnedAttempt(attemptId, userId);
    const updated = await prisma.assessmentAttempt.updateMany({
      where: { id: attemptId, userId, status: 'IN_PROGRESS' },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        ...(role === ROLES.GUEST ? { resultsLocked: true } : {}),
      },
    });
    if (updated.count === 0) {
      throw new BadRequestError('Only an in-progress attempt can be submitted.');
    }

    trackEvent({
      eventName: 'assessment.submitted',
      userId,
      properties: { attemptId, role },
    });
    await this.triggerEvaluation(attemptId, userId);
    return this.requireOwnedAttempt(attemptId, userId);
  }

  async getAttemptStatus(attemptId: string, userId: string) {
    const attempt = await this.requireOwnedAttempt(attemptId, userId);
    const evaluation = await prisma.attemptEvaluation.findUnique({
      where: { attemptId },
      select: { status: true },
    });
    return {
      attemptId: attempt.id,
      status: attempt.status,
      evaluationStatus: evaluation?.status ?? null,
      submittedAt: attempt.submittedAt,
      completedAt: attempt.completedAt,
      resultsLocked: attempt.resultsLocked,
    };
  }

  async getEvaluation(attemptId: string, userId: string, role: UserRoleValue) {
    const attempt = await this.requireResultsAccess(attemptId, userId, role);
    return prisma.attemptEvaluation.findUnique({
      where: { attemptId: attempt.id },
      include: { skillScores: { include: { skill: true } } },
    });
  }

  async triggerEvaluation(attemptId: string, userId: string) {
    const attempt = await this.requireOwnedAttempt(attemptId, userId);
    if (attempt.status === 'IN_PROGRESS') {
      throw new BadRequestError('Submit the attempt before requesting evaluation.');
    }

    const existing = await prisma.attemptEvaluation.findUnique({ where: { attemptId } });
    if (existing?.status === 'COMPLETED') {
      return existing;
    }

    const evaluation = await prisma.attemptEvaluation.upsert({
      where: { attemptId },
      update: {},
      create: { attemptId, status: 'PENDING' },
    });
    await getQueue(QUEUE_NAMES.AI_EVALUATION).add(
      'evaluate-assessment-attempt',
      { attemptId },
      { jobId: `assessment-evaluation-${attemptId}` },
    );
    trackEvent({
      eventName: 'evaluation.started',
      userId,
      properties: { attemptId, evaluationId: evaluation.id },
    });
    return evaluation;
  }

  async getJobReadinessScore(attemptId: string, userId: string, role: UserRoleValue) {
    await this.requireResultsAccess(attemptId, userId, role);
    const jrs = await prisma.jobReadinessScore.findUnique({
      where: { attemptId },
      include: { skillScores: { include: { skill: true } } },
    });
    if (!jrs) return null;
    trackEvent({ eventName: 'jrs.viewed', userId, properties: { attemptId } });
    return {
      overallScore: Number(jrs.overallScore),
      band: jrs.band,
      version: jrs.version,
      calculatedAt: jrs.calculatedAt,
      skillScores: jrs.skillScores.map((score) => ({
        skillId: score.skillId,
        skillCode: score.skill.code,
        skillName: score.skill.name,
        score: Number(score.score),
        weight: Number(score.weight),
      })),
    };
  }

  async getAiEvaluation(attemptId: string, userId: string, role: UserRoleValue) {
    await this.requireResultsAccess(attemptId, userId, role);
    return prisma.aiEvaluation.findUnique({ where: { attemptId } });
  }

  async getReports(attemptId: string, userId: string, role: UserRoleValue) {
    await this.requireResultsAccess(attemptId, userId, role);
    return prisma.aiReport.findMany({
      where: { attemptId, userId },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getVisibleAssessment(
    unique: { id: string } | { slug: string },
    role: UserRoleValue,
    userId?: string,
  ) {
    const assessment = await prisma.assessment.findFirst({
      where: {
        ...unique,
        status: 'PUBLISHED',
        isActive: true,
        deletedAt: null,
        ...(role === ROLES.GUEST ? { code: GUEST_ASSESSMENT_CODE, accessTier: 'FREE' } : {}),
      },
      include: {
        category: true,
        skills: { include: { skill: true } },
        _count: { select: { questions: true } },
      },
    });
    if (!assessment) {
      throw new NotFoundError('Assessment not found.');
    }

    if (role === ROLES.GUEST) {
      return { ...assessment, locked: false, upgradeRequired: false };
    }

    const hasPremium = userId
      ? await userHasFeature(userId, PLAN_FEATURES.ASSESSMENTS_PREMIUM)
      : false;
    const locked = assessment.accessTier === 'PREMIUM' && !hasPremium;
    return { ...assessment, locked, upgradeRequired: locked };
  }

  private async requireOwnedAttempt(attemptId: string, userId: string) {
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        assessment: {
          select: { id: true, code: true, slug: true, title: true },
        },
      },
    });
    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found.');
    }
    return attempt;
  }

  private async requireResultsAccess(attemptId: string, userId: string, role: UserRoleValue) {
    const attempt = await this.requireOwnedAttempt(attemptId, userId);
    if (attempt.resultsLocked || role === ROLES.GUEST) {
      throw new ForbiddenError('Assessment results are locked.', RESULTS_LOCKED_ERRORS);
    }
    return attempt;
  }
}

const catalogSelect = {
  id: true,
  code: true,
  slug: true,
  title: true,
  description: true,
  instructions: true,
  accessTier: true,
  durationMinutes: true,
  passingScore: true,
  category: { select: { code: true, name: true } },
  skills: {
    select: {
      weight: true,
      skill: { select: { code: true, name: true } },
    },
  },
  _count: { select: { questions: true } },
} as const;

export const assessmentsService = new AssessmentsService();
