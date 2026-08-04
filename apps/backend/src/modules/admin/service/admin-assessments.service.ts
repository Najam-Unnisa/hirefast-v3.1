import type { AssessmentAccessTier, AssessmentStatus, Prisma, QuestionType } from '@prisma/client';
import { prisma } from '../../../config/database';
import { writeAuditLog } from '../../../services/audit.service';
import { trackEvent } from '../../../services/analytics.service';
import { BadRequestError, ConflictError, NotFoundError } from '../../../utils/errors';
import { pageMeta, parsePageLimit } from '../utils/admin-query';

const ACCESS_TIERS = new Set(['FREE', 'PREMIUM']);
const ASSESSMENT_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const QUESTION_TYPES = new Set([
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'TRUE_FALSE',
  'SHORT_TEXT',
  'LONG_TEXT',
  'AUDIO',
  'VIDEO',
  'FILE_UPLOAD',
  'RATING',
]);

type AuditCtx = { ipAddress: string | null; userAgent: string | null };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export class AdminAssessmentsService {
  async listAssessments(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePageLimit(query);
    const where: Prisma.AssessmentWhereInput = { deletedAt: null };
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (typeof query.status === 'string' && ASSESSMENT_STATUSES.has(query.status)) {
      where.status = query.status as AssessmentStatus;
    }
    if (typeof query.accessTier === 'string' && ACCESS_TIERS.has(query.accessTier)) {
      where.accessTier = query.accessTier as AssessmentAccessTier;
    }

    const [items, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: { select: { id: true, code: true, name: true } },
          _count: { select: { questions: true, attempts: true } },
          skills: { include: { skill: { select: { id: true, code: true, name: true } } } },
        },
      }),
      prisma.assessment.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serializeAssessment(item)),
      meta: pageMeta(page, limit, total),
    };
  }

  async getAssessment(assessmentId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
      include: {
        category: { select: { id: true, code: true, name: true } },
        _count: { select: { questions: true, attempts: true } },
        skills: { include: { skill: { select: { id: true, code: true, name: true } } } },
      },
    });
    if (!assessment) throw new NotFoundError('Assessment not found.');
    return this.serializeAssessment(assessment);
  }

  async createAssessment(actorId: string, body: Record<string, unknown>, audit: AuditCtx) {
    const input = this.parseWriteBody(body, true);
    const created = await prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          categoryId: input.categoryId!,
          code: input.code!,
          slug: input.slug!,
          title: input.title!,
          description: input.description ?? null,
          instructions: input.instructions ?? null,
          accessTier: input.accessTier!,
          durationMinutes: input.durationMinutes ?? null,
          passingScore: input.passingScore ?? null,
          maxAttempts: input.maxAttempts ?? null,
          status: 'DRAFT',
          version: 1,
        },
      });
      const skillIds = input.skillIds ?? [];
      if (skillIds.length) {
        await tx.assessmentSkill.createMany({
          data: skillIds.map((skillId) => ({
            assessmentId: assessment.id,
            skillId,
            weight: 1,
          })),
        });
      }
      return assessment.id;
    });

    const result = await this.getAssessment(created);
    await writeAuditLog({
      actorId,
      action: 'CREATE',
      resourceType: 'assessment',
      resourceId: created,
      message: `Created assessment ${input.code}`,
      metadata: { code: input.code, title: input.title },
      ...audit,
    });
    trackEvent({
      eventName: 'admin.assessment_created',
      userId: actorId,
      properties: { assessmentId: created, code: input.code },
    });
    return result;
  }

  async updateAssessment(
    actorId: string,
    assessmentId: string,
    body: Record<string, unknown>,
    audit: AuditCtx,
  ) {
    const existing = await prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Assessment not found.');
    if (existing.status === 'PUBLISHED') {
      // Version bump on published content edits; historical attempts keep prior evaluation results.
    }

    const input = this.parseWriteBody(body, false);
    await prisma.$transaction(async (tx) => {
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          categoryId: input.categoryId ?? existing.categoryId,
          code: input.code ?? existing.code,
          slug: input.slug ?? existing.slug,
          title: input.title ?? existing.title,
          description: input.description === undefined ? existing.description : input.description,
          instructions:
            input.instructions === undefined ? existing.instructions : input.instructions,
          accessTier: input.accessTier ?? existing.accessTier,
          durationMinutes:
            input.durationMinutes === undefined ? existing.durationMinutes : input.durationMinutes,
          passingScore:
            input.passingScore === undefined ? existing.passingScore : input.passingScore,
          maxAttempts: input.maxAttempts === undefined ? existing.maxAttempts : input.maxAttempts,
          version: existing.status === 'PUBLISHED' ? existing.version + 1 : existing.version,
        },
      });
      if (input.skillIds !== undefined) {
        await tx.assessmentSkill.deleteMany({ where: { assessmentId } });
        if (input.skillIds.length) {
          await tx.assessmentSkill.createMany({
            data: input.skillIds.map((skillId) => ({
              assessmentId,
              skillId,
              weight: 1,
            })),
          });
        }
      }
    });

    const result = await this.getAssessment(assessmentId);
    await writeAuditLog({
      actorId,
      action: 'UPDATE',
      resourceType: 'assessment',
      resourceId: assessmentId,
      message: `Updated assessment ${result.code}`,
      ...audit,
    });
    trackEvent({
      eventName: 'admin.assessment_updated',
      userId: actorId,
      properties: { assessmentId },
    });
    return result;
  }

  async patchStatus(actorId: string, assessmentId: string, statusInput: unknown, audit: AuditCtx) {
    if (typeof statusInput !== 'string' || !ASSESSMENT_STATUSES.has(statusInput)) {
      throw new BadRequestError('status must be DRAFT, PUBLISHED, or ARCHIVED.');
    }
    const existing = await prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
      include: { _count: { select: { questions: true } } },
    });
    if (!existing) throw new NotFoundError('Assessment not found.');
    if (statusInput === 'PUBLISHED' && existing._count.questions === 0) {
      throw new BadRequestError('Publish requires at least one question.');
    }

    const updated = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: statusInput as AssessmentStatus,
        publishedAt: statusInput === 'PUBLISHED' ? new Date() : existing.publishedAt,
        isActive: statusInput !== 'ARCHIVED',
        version:
          statusInput === 'PUBLISHED' && existing.status !== 'PUBLISHED'
            ? existing.version + 1
            : existing.version,
      },
    });

    await writeAuditLog({
      actorId,
      action: statusInput === 'PUBLISHED' ? 'UPDATE' : 'UPDATE',
      resourceType: 'assessment',
      resourceId: assessmentId,
      message: `Assessment ${updated.code} status set to ${statusInput}`,
      metadata: { status: statusInput, previous: existing.status },
      ...audit,
    });
    if (statusInput === 'PUBLISHED') {
      trackEvent({
        eventName: 'admin.assessment_published',
        userId: actorId,
        properties: { assessmentId, code: updated.code },
      });
    }
    return this.getAssessment(assessmentId);
  }

  async duplicateAssessment(actorId: string, assessmentId: string, audit: AuditCtx) {
    const source = await prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
      include: {
        questions: {
          where: { deletedAt: null },
          include: { options: true },
          orderBy: { sortOrder: 'asc' },
        },
        skills: true,
      },
    });
    if (!source) throw new NotFoundError('Assessment not found.');

    const suffix = Date.now().toString(36).slice(-6);
    const code = `${source.code}_COPY_${suffix}`.slice(0, 64);
    const slug = `${source.slug}-copy-${suffix}`.slice(0, 128);

    const createdId = await prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          categoryId: source.categoryId,
          code,
          slug,
          title: `${source.title} (Copy)`,
          description: source.description,
          instructions: source.instructions,
          accessTier: source.accessTier,
          durationMinutes: source.durationMinutes,
          passingScore: source.passingScore,
          maxAttempts: source.maxAttempts,
          status: 'DRAFT',
          version: 1,
        },
      });
      if (source.skills.length) {
        await tx.assessmentSkill.createMany({
          data: source.skills.map((skill) => ({
            assessmentId: assessment.id,
            skillId: skill.skillId,
            weight: skill.weight,
          })),
        });
      }
      for (const question of source.questions) {
        const createdQuestion = await tx.question.create({
          data: {
            assessmentId: assessment.id,
            code: question.code,
            prompt: question.prompt,
            questionType: question.questionType,
            sortOrder: question.sortOrder,
            points: question.points,
            isRequired: question.isRequired,
            timeLimitSec: question.timeLimitSec,
            metadata: question.metadata ?? undefined,
          },
        });
        if (question.options.length) {
          await tx.questionOption.createMany({
            data: question.options.map((option) => ({
              questionId: createdQuestion.id,
              label: option.label,
              value: option.value,
              sortOrder: option.sortOrder,
              isCorrect: option.isCorrect,
              points: option.points,
            })),
          });
        }
      }
      return assessment.id;
    });

    await writeAuditLog({
      actorId,
      action: 'CREATE',
      resourceType: 'assessment',
      resourceId: createdId,
      message: `Duplicated assessment ${source.code} → ${code}`,
      metadata: { sourceId: assessmentId },
      ...audit,
    });
    return this.getAssessment(createdId);
  }

  async listQuestions(assessmentId: string, query: Record<string, unknown>) {
    await this.requireAssessment(assessmentId);
    const { page, limit, skip } = parsePageLimit(query);
    const where: Prisma.QuestionWhereInput = { assessmentId, deletedAt: null };
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    if (q) {
      where.OR = [
        { prompt: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (typeof query.questionType === 'string' && QUESTION_TYPES.has(query.questionType)) {
      where.questionType = query.questionType as QuestionType;
    }

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      }),
      prisma.question.count({ where }),
    ]);
    return {
      items: items.map((item) => this.serializeQuestion(item)),
      meta: pageMeta(page, limit, total),
    };
  }

  async createQuestion(
    actorId: string,
    assessmentId: string,
    body: Record<string, unknown>,
    audit: AuditCtx,
  ) {
    await this.requireAssessment(assessmentId);
    const code =
      typeof body.code === 'string' && body.code.trim()
        ? body.code.trim().toUpperCase()
        : `Q_${Date.now().toString(36).toUpperCase()}`;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) throw new BadRequestError('prompt is required.');
    const questionType =
      typeof body.questionType === 'string' && QUESTION_TYPES.has(body.questionType)
        ? (body.questionType as QuestionType)
        : null;
    if (!questionType) throw new BadRequestError('Valid questionType is required.');

    const maxSort = await prisma.question.aggregate({
      where: { assessmentId, deletedAt: null },
      _max: { sortOrder: true },
    });

    try {
      const question = await prisma.question.create({
        data: {
          assessmentId,
          code,
          prompt,
          questionType,
          sortOrder:
            typeof body.sortOrder === 'number' ? body.sortOrder : (maxSort._max.sortOrder ?? 0) + 1,
          points: typeof body.points === 'number' ? body.points : 1,
          isRequired: body.isRequired !== false,
          timeLimitSec: typeof body.timeLimitSec === 'number' ? body.timeLimitSec : null,
          metadata:
            body.metadata && typeof body.metadata === 'object'
              ? (body.metadata as Prisma.InputJsonValue)
              : undefined,
        },
        include: { options: true },
      });
      await writeAuditLog({
        actorId,
        action: 'CREATE',
        resourceType: 'question',
        resourceId: question.id,
        message: `Created question ${code}`,
        metadata: { assessmentId },
        ...audit,
      });
      trackEvent({
        eventName: 'admin.question_created',
        userId: actorId,
        properties: { questionId: question.id, assessmentId },
      });
      return this.serializeQuestion(question);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictError('Question code already exists on this assessment.');
      }
      throw error;
    }
  }

  async updateQuestion(
    actorId: string,
    questionId: string,
    body: Record<string, unknown>,
    audit: AuditCtx,
  ) {
    const existing = await prisma.question.findFirst({
      where: { id: questionId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Question not found.');

    const data: Prisma.QuestionUpdateInput = {};
    if (typeof body.prompt === 'string') data.prompt = body.prompt.trim();
    if (typeof body.code === 'string') data.code = body.code.trim().toUpperCase();
    if (typeof body.questionType === 'string' && QUESTION_TYPES.has(body.questionType)) {
      data.questionType = body.questionType as QuestionType;
    }
    if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
    if (typeof body.points === 'number') data.points = body.points;
    if (typeof body.isRequired === 'boolean') data.isRequired = body.isRequired;
    if (body.timeLimitSec === null) data.timeLimitSec = null;
    if (typeof body.timeLimitSec === 'number') data.timeLimitSec = body.timeLimitSec;
    if (body.metadata && typeof body.metadata === 'object') {
      data.metadata = body.metadata as Prisma.InputJsonValue;
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data,
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    await writeAuditLog({
      actorId,
      action: 'UPDATE',
      resourceType: 'question',
      resourceId: questionId,
      message: `Updated question ${updated.code}`,
      ...audit,
    });
    trackEvent({
      eventName: 'admin.question_updated',
      userId: actorId,
      properties: { questionId },
    });
    return this.serializeQuestion(updated);
  }

  async deleteQuestion(actorId: string, questionId: string, audit: AuditCtx) {
    const existing = await prisma.question.findFirst({
      where: { id: questionId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Question not found.');
    await prisma.question.update({
      where: { id: questionId },
      data: { deletedAt: new Date() },
    });
    await writeAuditLog({
      actorId,
      action: 'DELETE',
      resourceType: 'question',
      resourceId: questionId,
      message: `Soft-deleted question ${existing.code}`,
      ...audit,
    });
    return { id: questionId, deleted: true as const };
  }

  async addOption(
    actorId: string,
    questionId: string,
    body: Record<string, unknown>,
    audit: AuditCtx,
  ) {
    const question = await prisma.question.findFirst({
      where: { id: questionId, deletedAt: null },
    });
    if (!question) throw new NotFoundError('Question not found.');
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const value = typeof body.value === 'string' ? body.value.trim() : label;
    if (!label) throw new BadRequestError('label is required.');
    const maxSort = await prisma.questionOption.aggregate({
      where: { questionId },
      _max: { sortOrder: true },
    });
    const option = await prisma.questionOption.create({
      data: {
        questionId,
        label,
        value: value || label,
        sortOrder:
          typeof body.sortOrder === 'number' ? body.sortOrder : (maxSort._max.sortOrder ?? 0) + 1,
        isCorrect: body.isCorrect === true,
        points: typeof body.points === 'number' ? body.points : null,
      },
    });
    await writeAuditLog({
      actorId,
      action: 'CREATE',
      resourceType: 'question_option',
      resourceId: option.id,
      message: `Added option to question ${question.code}`,
      ...audit,
    });
    return option;
  }

  async updateOption(
    actorId: string,
    optionId: string,
    body: Record<string, unknown>,
    audit: AuditCtx,
  ) {
    const existing = await prisma.questionOption.findUnique({ where: { id: optionId } });
    if (!existing) throw new NotFoundError('Option not found.');
    const updated = await prisma.questionOption.update({
      where: { id: optionId },
      data: {
        label: typeof body.label === 'string' ? body.label.trim() : undefined,
        value: typeof body.value === 'string' ? body.value.trim() : undefined,
        sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
        isCorrect: typeof body.isCorrect === 'boolean' ? body.isCorrect : undefined,
        points:
          typeof body.points === 'number' ? body.points : body.points === null ? null : undefined,
      },
    });
    await writeAuditLog({
      actorId,
      action: 'UPDATE',
      resourceType: 'question_option',
      resourceId: optionId,
      message: `Updated question option`,
      ...audit,
    });
    return updated;
  }

  async deleteOption(actorId: string, optionId: string, audit: AuditCtx) {
    const existing = await prisma.questionOption.findUnique({ where: { id: optionId } });
    if (!existing) throw new NotFoundError('Option not found.');
    await prisma.questionOption.delete({ where: { id: optionId } });
    await writeAuditLog({
      actorId,
      action: 'DELETE',
      resourceType: 'question_option',
      resourceId: optionId,
      message: `Deleted question option`,
      ...audit,
    });
    return { id: optionId, deleted: true as const };
  }

  async listCategories() {
    return prisma.assessmentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true, name: true, description: true, sortOrder: true },
    });
  }

  async listSkills() {
    return prisma.skill.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        domain: true,
        assessmentSkills: {
          select: {
            assessmentId: true,
            weight: true,
            assessment: { select: { code: true, title: true, status: true } },
          },
        },
      },
    });
  }

  async updateSkillWeight(
    actorId: string,
    assessmentId: string,
    skillId: string,
    weightInput: unknown,
    audit: AuditCtx,
  ) {
    const weight = typeof weightInput === 'number' ? weightInput : Number(weightInput);
    if (!Number.isFinite(weight) || weight < 0) {
      throw new BadRequestError('weight must be a non-negative number.');
    }
    await this.requireAssessment(assessmentId);
    const skill = await prisma.skill.findFirst({ where: { id: skillId } });
    if (!skill) throw new NotFoundError('Skill not found.');

    const link = await prisma.assessmentSkill.upsert({
      where: { assessmentId_skillId: { assessmentId, skillId } },
      update: { weight },
      create: { assessmentId, skillId, weight },
      include: { skill: { select: { code: true, name: true } } },
    });
    await writeAuditLog({
      actorId,
      action: 'UPDATE',
      resourceType: 'assessment_skill',
      resourceId: link.id,
      message: `Set skill weight ${link.skill.code}=${weight} on assessment`,
      metadata: { assessmentId, skillId, weight },
      ...audit,
    });
    return {
      id: link.id,
      assessmentId,
      skillId,
      skillCode: link.skill.code,
      skillName: link.skill.name,
      weight: Number(link.weight),
    };
  }

  private parseWriteBody(body: Record<string, unknown>, requireAll: boolean) {
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId : undefined;
    const code =
      typeof body.code === 'string'
        ? body.code.trim().toUpperCase().replace(/\s+/g, '_')
        : undefined;
    const title = typeof body.title === 'string' ? body.title.trim() : undefined;
    const slug =
      typeof body.slug === 'string'
        ? body.slug.trim().toLowerCase()
        : title
          ? slugify(title)
          : undefined;
    const accessTier =
      typeof body.accessTier === 'string' && ACCESS_TIERS.has(body.accessTier)
        ? (body.accessTier as AssessmentAccessTier)
        : undefined;

    if (requireAll) {
      if (!categoryId) throw new BadRequestError('categoryId is required.');
      if (!code) throw new BadRequestError('code is required.');
      if (!slug) throw new BadRequestError('slug is required.');
      if (!title) throw new BadRequestError('title is required.');
      if (!accessTier) throw new BadRequestError('accessTier is required.');
    }

    const skillIds = Array.isArray(body.skillIds)
      ? body.skillIds.filter((id): id is string => typeof id === 'string')
      : requireAll
        ? []
        : undefined;

    return {
      categoryId,
      code,
      slug,
      title,
      description: typeof body.description === 'string' ? body.description.trim() : undefined,
      instructions: typeof body.instructions === 'string' ? body.instructions.trim() : undefined,
      accessTier,
      durationMinutes: typeof body.durationMinutes === 'number' ? body.durationMinutes : undefined,
      passingScore: typeof body.passingScore === 'number' ? body.passingScore : undefined,
      maxAttempts: typeof body.maxAttempts === 'number' ? body.maxAttempts : undefined,
      skillIds,
    };
  }

  private async requireAssessment(assessmentId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
    });
    if (!assessment) throw new NotFoundError('Assessment not found.');
    return assessment;
  }

  private serializeAssessment(item: {
    id: string;
    categoryId: string;
    code: string;
    slug: string;
    title: string;
    description: string | null;
    instructions: string | null;
    status: AssessmentStatus;
    accessTier: AssessmentAccessTier;
    durationMinutes: number | null;
    passingScore: Prisma.Decimal | null;
    maxAttempts: number | null;
    version: number;
    isActive: boolean;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    category?: { id: string; code: string; name: string };
    _count?: { questions: number; attempts: number };
    skills?: Array<{
      weight: Prisma.Decimal;
      skill: { id: string; code: string; name: string };
    }>;
  }) {
    return {
      id: item.id,
      categoryId: item.categoryId,
      categoryName: item.category?.name ?? null,
      category: item.category ?? null,
      code: item.code,
      slug: item.slug,
      title: item.title,
      description: item.description,
      instructions: item.instructions,
      status: item.status,
      accessTier: item.accessTier,
      durationMinutes: item.durationMinutes,
      passingScore: item.passingScore != null ? Number(item.passingScore) : null,
      maxAttempts: item.maxAttempts,
      version: item.version,
      isActive: item.isActive,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      questionCount: item._count?.questions ?? 0,
      attemptCount: item._count?.attempts ?? 0,
      skills:
        item.skills?.map((link) => ({
          skillId: link.skill.id,
          skillCode: link.skill.code,
          skillName: link.skill.name,
          weight: Number(link.weight),
        })) ?? [],
    };
  }

  private serializeQuestion(item: {
    id: string;
    assessmentId: string;
    code: string;
    prompt: string;
    questionType: QuestionType;
    sortOrder: number;
    points: Prisma.Decimal;
    isRequired: boolean;
    timeLimitSec: number | null;
    metadata: Prisma.JsonValue | null;
    options?: Array<{
      id: string;
      label: string;
      value: string;
      sortOrder: number;
      isCorrect: boolean;
      points: Prisma.Decimal | null;
    }>;
  }) {
    return {
      id: item.id,
      assessmentId: item.assessmentId,
      code: item.code,
      prompt: item.prompt,
      questionType: item.questionType,
      sortOrder: item.sortOrder,
      points: Number(item.points),
      isRequired: item.isRequired,
      timeLimitSec: item.timeLimitSec,
      metadata: item.metadata,
      options:
        item.options?.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          sortOrder: option.sortOrder,
          isCorrect: option.isCorrect,
          points: option.points != null ? Number(option.points) : null,
        })) ?? [],
    };
  }
}

export const adminAssessmentsService = new AdminAssessmentsService();
