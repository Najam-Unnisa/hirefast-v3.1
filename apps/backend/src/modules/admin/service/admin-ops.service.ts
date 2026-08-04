import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { ROLES } from '../../../constants/roles';
import { PLAN_CODES } from '../../../constants/subscription';
import { getQueue, QUEUE_NAMES } from '../../../jobs';
import { writeAuditLog } from '../../../services/audit.service';
import { trackEvent } from '../../../services/analytics.service';
import { BadRequestError, NotFoundError } from '../../../utils/errors';
import { pageMeta, parsePageLimit } from '../utils/admin-query';
import { countUsersByPlan } from './admin-users.service';

type AuditCtx = { ipAddress: string | null; userAgent: string | null };

export class AdminOpsService {
  async getOverview() {
    const [
      totalCandidates,
      guestUsers,
      registeredUsers,
      premiumUsers,
      activeAssessments,
      pendingEvaluations,
      completedEvaluations,
      failedEvaluations,
      recentActions,
    ] = await Promise.all([
      prisma.user.count({
        where: { deletedAt: null, role: { name: { in: [ROLES.USER, ROLES.GUEST] } } },
      }),
      prisma.user.count({ where: { deletedAt: null, role: { name: ROLES.GUEST } } }),
      prisma.user.count({ where: { deletedAt: null, role: { name: ROLES.USER } } }),
      countUsersByPlan(PLAN_CODES.PREMIUM),
      prisma.assessment.count({
        where: { deletedAt: null, status: 'PUBLISHED', isActive: true },
      }),
      prisma.attemptEvaluation.count({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      }),
      prisma.attemptEvaluation.count({ where: { status: 'COMPLETED' } }),
      prisma.attemptEvaluation.count({ where: { status: 'FAILED' } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { actor: { select: { email: true } } },
      }),
    ]);

    const health = {
      status: failedEvaluations > 20 ? 'degraded' : 'healthy',
      pendingEvaluations,
      failedEvaluations,
    };

    return {
      totalCandidates,
      guestUsers,
      registeredUsers,
      premiumUsers,
      activeAssessments,
      pendingEvaluations,
      completedEvaluations,
      failedEvaluations,
      platformHealth: health,
      recentAdministrativeActions: recentActions.map((item) => ({
        id: item.id,
        action: item.action,
        resourceType: item.resourceType,
        message: item.message,
        actorEmail: item.actor?.email ?? null,
        createdAt: item.createdAt,
      })),
      quickActions: [
        { key: 'candidates', title: 'Manage candidates', href: '/candidates' },
        { key: 'assessments', title: 'Manage assessments', href: '/assessments' },
        { key: 'evaluations', title: 'Monitor evaluations', href: '/evaluations' },
        { key: 'settings', title: 'Platform settings', href: '/settings' },
      ],
    };
  }

  async listAnalyticsEvents(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePageLimit(query);
    const where: Prisma.AnalyticsEventWhereInput = {};
    if (typeof query.eventName === 'string' && query.eventName.trim()) {
      where.eventName = { contains: query.eventName.trim(), mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          eventName: true,
          userId: true,
          properties: true,
          createdAt: true,
        },
      }),
      prisma.analyticsEvent.count({ where }),
    ]);
    return { items, meta: pageMeta(page, limit, total) };
  }

  async ingestAdminEvent(actorId: string, eventName: unknown, properties: unknown) {
    if (typeof eventName !== 'string' || !eventName.trim()) {
      throw new BadRequestError('eventName is required.');
    }
    trackEvent({
      eventName: eventName.trim(),
      userId: actorId,
      properties:
        properties && typeof properties === 'object'
          ? (properties as Prisma.InputJsonValue)
          : undefined,
    });
    return { recorded: true as const, eventName: eventName.trim() };
  }

  async listReports(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePageLimit(query);
    const where: Prisma.AiReportWhereInput = {};
    if (typeof query.status === 'string') where.status = query.status as never;
    const [items, total] = await Promise.all([
      prisma.aiReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true } },
          attempt: { select: { id: true, assessment: { select: { title: true } } } },
        },
      }),
      prisma.aiReport.count({ where }),
    ]);
    trackEvent({ eventName: 'admin.report_generated', properties: { page, total } });
    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        summary: item.summary,
        generatedAt: item.generatedAt,
        userId: item.userId,
        userEmail: item.user.email,
        attemptId: item.attemptId,
        assessmentTitle: item.attempt?.assessment.title ?? null,
      })),
      meta: pageMeta(page, limit, total),
    };
  }

  async getPlatformReport() {
    const [jrsBands, completionByTier, growth] = await Promise.all([
      prisma.jobReadinessScore.groupBy({
        by: ['band'],
        _count: { _all: true },
      }),
      prisma.assessmentAttempt.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.user.findMany({
        where: { deletedAt: null, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
        select: { createdAt: true, role: { select: { name: true } } },
      }),
    ]);
    return {
      jrsDistribution: jrsBands.map((row) => ({
        band: row.band ?? 'UNKNOWN',
        count: row._count._all,
      })),
      assessmentCompletion: completionByTier.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      userGrowthLast30Days: growth.length,
      guestGrowthLast30Days: growth.filter((u) => u.role.name === ROLES.GUEST).length,
      registeredGrowthLast30Days: growth.filter((u) => u.role.name === ROLES.USER).length,
    };
  }

  async listSettings() {
    return prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        isPublic: true,
        updatedAt: true,
      },
    });
  }

  async upsertSetting(
    actorId: string,
    key: string,
    body: { value?: unknown; description?: unknown; isPublic?: unknown },
    audit: AuditCtx,
  ) {
    if (!key?.trim()) throw new BadRequestError('Setting key is required.');
    if (body.value === undefined) throw new BadRequestError('value is required.');
    const updated = await prisma.platformSetting.upsert({
      where: { key: key.trim() },
      update: {
        value: body.value as Prisma.InputJsonValue,
        description: typeof body.description === 'string' ? body.description : undefined,
        isPublic: typeof body.isPublic === 'boolean' ? body.isPublic : undefined,
      },
      create: {
        key: key.trim(),
        value: body.value as Prisma.InputJsonValue,
        description: typeof body.description === 'string' ? body.description : null,
        isPublic: body.isPublic === true,
      },
    });
    await writeAuditLog({
      actorId,
      action: 'SETTINGS_CHANGE',
      resourceType: 'platform_setting',
      resourceId: updated.id,
      message: `Updated platform setting ${updated.key}`,
      metadata: { key: updated.key },
      ...audit,
    });
    trackEvent({
      eventName: 'admin.platform_settings_updated',
      userId: actorId,
      properties: { key: updated.key },
    });
    return updated;
  }

  async listAuditLogs(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePageLimit(query);
    const where: Prisma.AuditLogWhereInput = {};
    if (typeof query.action === 'string') where.action = query.action as never;
    if (typeof query.resourceType === 'string') where.resourceType = query.resourceType;
    if (typeof query.q === 'string' && query.q.trim()) {
      where.message = { contains: query.q.trim(), mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    trackEvent({ eventName: 'admin.audit_log_viewed', properties: { page, total } });
    return {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        message: item.message,
        metadata: item.metadata,
        ipAddress: item.ipAddress,
        createdAt: item.createdAt,
        actor: item.actor,
      })),
      meta: pageMeta(page, limit, total),
    };
  }

  async listEvaluations(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePageLimit(query);
    const where: Prisma.AttemptEvaluationWhereInput = {};
    if (typeof query.status === 'string') where.status = query.status as never;
    const [items, total] = await Promise.all([
      prisma.attemptEvaluation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          attempt: {
            select: {
              id: true,
              status: true,
              user: { select: { id: true, email: true } },
              assessment: { select: { title: true, code: true } },
              aiEvaluation: { select: { status: true, summary: true } },
            },
          },
        },
      }),
      prisma.attemptEvaluation.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id,
        attemptId: item.attemptId,
        status: item.status,
        percentage: item.percentage != null ? Number(item.percentage) : null,
        passed: item.passed,
        errorMessage: item.errorMessage,
        updatedAt: item.updatedAt,
        candidateEmail: item.attempt.user.email,
        assessmentTitle: item.attempt.assessment.title,
        attemptStatus: item.attempt.status,
        aiStatus: item.attempt.aiEvaluation?.status ?? null,
      })),
      meta: pageMeta(page, limit, total),
    };
  }

  async retryEvaluation(actorId: string, attemptId: string, audit: AuditCtx) {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { evaluation: true },
    });
    if (!attempt) throw new NotFoundError('Attempt not found.');
    if (!['SUBMITTED', 'EVALUATING', 'FAILED', 'COMPLETED'].includes(attempt.status)) {
      throw new BadRequestError('Attempt is not eligible for evaluation retry.');
    }
    if (attempt.evaluation?.status === 'COMPLETED' && attempt.status === 'COMPLETED') {
      throw new BadRequestError(
        'Completed evaluations are immutable. Retry only failed or stuck jobs.',
      );
    }

    await prisma.attemptEvaluation.upsert({
      where: { attemptId },
      update: { status: 'PENDING', errorMessage: null },
      create: { attemptId, status: 'PENDING' },
    });
    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { status: 'EVALUATING' },
    });
    await getQueue(QUEUE_NAMES.AI_EVALUATION).add(
      'evaluate-assessment-attempt',
      { attemptId },
      { jobId: `assessment-evaluation-retry-${attemptId}-${Date.now()}` },
    );
    await writeAuditLog({
      actorId,
      action: 'UPDATE',
      resourceType: 'evaluation',
      resourceId: attemptId,
      message: `Retried evaluation for attempt ${attemptId}`,
      ...audit,
    });
    return { attemptId, queued: true as const };
  }

  async getAttemptReview(attemptId: string) {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        user: { select: { id: true, email: true, role: { select: { name: true } } } },
        assessment: { select: { id: true, title: true, code: true, accessTier: true } },
        responses: {
          include: {
            question: { select: { id: true, code: true, prompt: true, questionType: true } },
            selectedOption: { select: { id: true, label: true, value: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        evaluation: true,
        aiEvaluation: true,
        jobReadinessScore: {
          include: { skillScores: { include: { skill: true } } },
        },
        aiReports: { orderBy: { createdAt: 'desc' }, take: 3 },
        hrReviews: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!attempt) throw new NotFoundError('Attempt not found.');
    return {
      id: attempt.id,
      status: attempt.status,
      resultsLocked: attempt.resultsLocked,
      candidate: attempt.user,
      assessment: attempt.assessment,
      responses: attempt.responses.map((response) => ({
        id: response.id,
        question: response.question,
        selectedOption: response.selectedOption,
        textAnswer: response.textAnswer,
        numericAnswer: response.numericAnswer != null ? Number(response.numericAnswer) : null,
        answeredAt: response.answeredAt,
      })),
      evaluation: attempt.evaluation
        ? {
            status: attempt.evaluation.status,
            percentage:
              attempt.evaluation.percentage != null ? Number(attempt.evaluation.percentage) : null,
            passed: attempt.evaluation.passed,
            errorMessage: attempt.evaluation.errorMessage,
          }
        : null,
      aiEvaluation: attempt.aiEvaluation,
      jrs: attempt.jobReadinessScore
        ? {
            overallScore: Number(attempt.jobReadinessScore.overallScore),
            band: attempt.jobReadinessScore.band,
            skills: attempt.jobReadinessScore.skillScores.map((score) => ({
              skillCode: score.skill.code,
              skillName: score.skill.name,
              score: Number(score.score),
              weight: Number(score.weight),
            })),
          }
        : null,
      reports: attempt.aiReports,
      hrReviews: attempt.hrReviews,
    };
  }

  async listHrReviews(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePageLimit(query);
    const where: Prisma.HrReviewWhereInput = {};
    if (typeof query.status === 'string') where.status = query.status as never;
    const [items, total] = await Promise.all([
      prisma.hrReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { id: true, email: true } },
          attempt: {
            select: {
              id: true,
              user: { select: { id: true, email: true } },
              assessment: { select: { title: true } },
            },
          },
        },
      }),
      prisma.hrReview.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        notes: item.notes,
        decisionAt: item.decisionAt,
        createdAt: item.createdAt,
        reviewer: item.reviewer,
        attemptId: item.attemptId,
        candidateEmail: item.attempt.user.email,
        assessmentTitle: item.attempt.assessment.title,
      })),
      meta: pageMeta(page, limit, total),
    };
  }

  async getHrReview(reviewId: string) {
    const review = await prisma.hrReview.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: { select: { id: true, email: true } },
        attempt: {
          include: {
            user: { select: { id: true, email: true } },
            assessment: { select: { title: true, code: true } },
            aiEvaluation: true,
            jobReadinessScore: true,
          },
        },
      },
    });
    if (!review) throw new NotFoundError('HR review not found.');
    return review;
  }

  async createHrReview(
    actorId: string,
    body: { attemptId?: unknown; notes?: unknown },
    audit: AuditCtx,
  ) {
    if (typeof body.attemptId !== 'string') {
      throw new BadRequestError('attemptId is required.');
    }
    const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: body.attemptId } });
    if (!attempt) throw new NotFoundError('Attempt not found.');
    const review = await prisma.hrReview.create({
      data: {
        attemptId: body.attemptId,
        reviewerId: actorId,
        status: 'IN_REVIEW',
        notes: typeof body.notes === 'string' ? body.notes : null,
      },
    });
    await writeAuditLog({
      actorId,
      action: 'CREATE',
      resourceType: 'hr_review',
      resourceId: review.id,
      message: `Created HR review for attempt ${body.attemptId}`,
      ...audit,
    });
    return review;
  }

  async patchHrReview(
    actorId: string,
    reviewId: string,
    body: { status?: unknown; notes?: unknown },
    audit: AuditCtx,
  ) {
    const existing = await prisma.hrReview.findUnique({ where: { id: reviewId } });
    if (!existing) throw new NotFoundError('HR review not found.');
    const allowed = new Set(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES']);
    if (
      body.status !== undefined &&
      (typeof body.status !== 'string' || !allowed.has(body.status))
    ) {
      throw new BadRequestError('Invalid HR review status.');
    }
    const updated = await prisma.hrReview.update({
      where: { id: reviewId },
      data: {
        status: typeof body.status === 'string' ? (body.status as never) : undefined,
        notes: typeof body.notes === 'string' ? body.notes : undefined,
        reviewerId: actorId,
        decisionAt:
          typeof body.status === 'string' &&
          ['APPROVED', 'REJECTED', 'NEEDS_CHANGES'].includes(body.status)
            ? new Date()
            : existing.decisionAt,
      },
    });
    await writeAuditLog({
      actorId,
      action: 'UPDATE',
      resourceType: 'hr_review',
      resourceId: reviewId,
      message: `Updated HR review to ${updated.status}`,
      metadata: { status: updated.status },
      ...audit,
    });
    trackEvent({
      eventName: 'admin.hr_review_completed',
      userId: actorId,
      properties: { reviewId, status: updated.status },
    });
    return updated;
  }
}

export const adminOpsService = new AdminOpsService();
