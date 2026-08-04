import type { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import { ROLES } from '../../../constants/roles';
import { PLAN_CODES } from '../../../constants/subscription';
import { writeAuditLog } from '../../../services/audit.service';
import { trackEvent } from '../../../services/analytics.service';
import { BadRequestError, NotFoundError } from '../../../utils/errors';
import { pageMeta, parsePageLimit } from '../utils/admin-query';

const ROLE_NAMES = new Set<string>([ROLES.ADMIN, ROLES.USER, ROLES.GUEST]);
const USER_STATUSES = new Set<string>(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_REGISTRATION']);

export class AdminUsersService {
  async listUsers(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePageLimit(query);
    const where: Prisma.UserWhereInput = { deletedAt: null };

    const q = typeof query.q === 'string' ? query.q.trim() : '';
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { profile: { displayName: { contains: q, mode: 'insensitive' } } },
        { profile: { firstName: { contains: q, mode: 'insensitive' } } },
        { profile: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (typeof query.status === 'string' && USER_STATUSES.has(query.status)) {
      where.status = query.status as UserStatus;
    }
    if (typeof query.role === 'string' && ROLE_NAMES.has(query.role)) {
      where.role = { name: query.role };
    }
    if (typeof query.from === 'string') {
      where.createdAt = { ...(where.createdAt as object), gte: new Date(query.from) };
    }
    if (typeof query.to === 'string') {
      where.createdAt = {
        ...((where.createdAt as object) ?? {}),
        lte: new Date(query.to),
      };
    }

    const sortBy = query.sortBy === 'email' ? 'email' : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          role: { select: { name: true } },
          profile: {
            select: {
              displayName: true,
              firstName: true,
              lastName: true,
              headline: true,
              isComplete: true,
            },
          },
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'TRIALING'] } },
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { plan: { select: { code: true, name: true } } },
          },
          _count: { select: { attempts: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: items.map((user) => ({
        id: user.id,
        email: user.email,
        status: user.status,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        role: user.role,
        profile: user.profile,
        planCode: user.subscriptions[0]?.plan.code ?? null,
        attemptCount: user._count.attempts,
      })),
      meta: pageMeta(page, limit, total),
    };
  }

  async getUser(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
        profile: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { plan: { select: { code: true, name: true } } },
        },
        jobReadinessScores: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
          select: { overallScore: true, band: true, calculatedAt: true, version: true },
        },
        _count: { select: { attempts: true, aiReports: true } },
      },
    });
    if (!user) throw new NotFoundError('User not found.');

    trackEvent({ eventName: 'admin.candidate_viewed', properties: { userId } });
    return {
      ...user,
      latestJrs: user.jobReadinessScores[0]
        ? {
            overallScore: Number(user.jobReadinessScores[0].overallScore),
            band: user.jobReadinessScores[0].band,
            calculatedAt: user.jobReadinessScores[0].calculatedAt,
            version: user.jobReadinessScores[0].version,
          }
        : null,
      jobReadinessScores: undefined,
    };
  }

  async patchUser(
    actorId: string,
    userId: string,
    body: { status?: unknown; role?: unknown },
    audit: { ipAddress: string | null; userAgent: string | null },
  ) {
    const existing = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { role: true },
    });
    if (!existing) throw new NotFoundError('User not found.');

    const data: Prisma.UserUpdateInput = {};
    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !USER_STATUSES.has(body.status)) {
        throw new BadRequestError('Invalid status.');
      }
      data.status = body.status as UserStatus;
    }
    if (body.role !== undefined) {
      if (typeof body.role !== 'string' || !ROLE_NAMES.has(body.role)) {
        throw new BadRequestError('Invalid role.');
      }
      if (userId === actorId && body.role !== ROLES.ADMIN) {
        throw new BadRequestError('Administrators cannot remove their own ADMIN role.');
      }
      const role = await prisma.role.findUnique({ where: { name: body.role } });
      if (!role) throw new NotFoundError('Role not found.');
      data.role = { connect: { id: role.id } };
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('Provide status and/or role to update.');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        status: true,
        role: { select: { name: true } },
        profile: { select: { displayName: true, isComplete: true } },
      },
    });

    await writeAuditLog({
      actorId,
      action: 'UPDATE',
      resourceType: 'user',
      resourceId: userId,
      message: `Updated user ${updated.email}`,
      metadata: { status: updated.status, role: updated.role.name },
      ...audit,
    });

    return updated;
  }

  async listUserAttempts(userId: string, query: Record<string, unknown>) {
    await this.requireUser(userId);
    const { page, limit, skip } = parsePageLimit(query);
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.assessmentAttempt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assessment: { select: { id: true, title: true, slug: true, accessTier: true } },
          evaluation: { select: { status: true, percentage: true, passed: true } },
          jobReadinessScore: { select: { overallScore: true, band: true } },
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
        evaluationStatus: item.evaluation?.status ?? null,
        score: item.evaluation?.percentage != null ? Number(item.evaluation.percentage) : null,
        jrs: item.jobReadinessScore
          ? {
              overallScore: Number(item.jobReadinessScore.overallScore),
              band: item.jobReadinessScore.band,
            }
          : null,
      })),
      meta: pageMeta(page, limit, total),
    };
  }

  async listUserReports(userId: string, query: Record<string, unknown>) {
    await this.requireUser(userId);
    const { page, limit, skip } = parsePageLimit(query);
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.aiReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          attempt: { select: { id: true, assessment: { select: { title: true } } } },
        },
      }),
      prisma.aiReport.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        summary: item.summary,
        generatedAt: item.generatedAt,
        attemptId: item.attemptId,
        assessmentTitle: item.attempt?.assessment.title ?? null,
      })),
      meta: pageMeta(page, limit, total),
    };
  }

  private async requireUser(userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }
}

export const adminUsersService = new AdminUsersService();

/** Convenience for overview premium counts. */
export async function countUsersByPlan(planCode: string): Promise<number> {
  return prisma.userSubscription.count({
    where: {
      status: { in: ['ACTIVE', 'TRIALING'] },
      plan: { code: planCode },
      user: { deletedAt: null },
    },
  });
}

export { PLAN_CODES };
