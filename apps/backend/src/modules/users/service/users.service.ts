import { prisma } from '../../../config/database';
import { ROLES } from '../../../constants/roles';
import { trackEvent } from '../../../services/analytics.service';
import { gamificationService } from '../../../services/gamification.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../utils/errors';
import { materializeUnlockedResultsForUser } from '../../assessments/jobs/evaluation.worker';

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string | null;
  headline?: string | null;
  bio?: string | null;
  locale?: string | null;
  timezone?: string | null;
  countryCode?: string | null;
  educationSummary?: string | null;
  skillsSummary?: string | null;
}

function asOptionalString(value: unknown, field: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestError(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new BadRequestError(`${field} must be ${max} characters or fewer.`);
  }
  return trimmed.length ? trimmed : null;
}

export class UsersService {
  async getMyProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        role: { select: { name: true } },
        profile: true,
      },
    });
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const resume = await prisma.fileObject.findFirst({
      where: {
        uploadedById: userId,
        purpose: 'OTHER',
        deletedAt: null,
        OR: [
          { fileName: { contains: 'resume', mode: 'insensitive' } },
          { mimeType: 'application/pdf' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      resume: resume
        ? {
            ...resume,
            sizeBytes: Number(resume.sizeBytes),
          }
        : null,
    };
  }

  async updateMyProfile(userId: string, body: ProfileUpdateInput) {
    const firstName = asOptionalString(body.firstName, 'firstName', 100);
    const lastName = asOptionalString(body.lastName, 'lastName', 100);
    const displayName = asOptionalString(body.displayName, 'displayName', 150);
    const phone = asOptionalString(body.phone, 'phone', 32);
    const headline = asOptionalString(body.headline, 'headline', 255);
    const bio = asOptionalString(body.bio, 'bio', 5000);
    const locale = asOptionalString(body.locale, 'locale', 16);
    const timezone = asOptionalString(body.timezone, 'timezone', 64);
    const countryCode = asOptionalString(body.countryCode, 'countryCode', 2);

    // Education / skills are stored in bio metadata block until dedicated tables exist.
    const educationSummary = asOptionalString(body.educationSummary, 'educationSummary', 2000);
    const skillsSummary = asOptionalString(body.skillsSummary, 'skillsSummary', 2000);

    const existing = await prisma.userProfile.findUnique({ where: { userId } });
    if (!existing) {
      throw new NotFoundError('Profile not found.');
    }

    let nextBio = bio !== undefined ? bio : existing.bio;
    if (educationSummary !== undefined || skillsSummary !== undefined) {
      const education =
        educationSummary !== undefined
          ? educationSummary
          : extractTagged(existing.bio, 'education');
      const skills =
        skillsSummary !== undefined ? skillsSummary : extractTagged(existing.bio, 'skills');
      const core = bio !== undefined ? bio : stripTagged(existing.bio ?? '');
      nextBio = composeTaggedBio(core, education, skills);
    }

    const updated = await prisma.userProfile.update({
      where: { userId },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(displayName !== undefined
          ? { displayName }
          : firstName !== undefined || lastName !== undefined
            ? {
                displayName:
                  `${firstName ?? existing.firstName ?? ''} ${lastName ?? existing.lastName ?? ''}`.trim(),
              }
            : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(headline !== undefined ? { headline } : {}),
        ...(nextBio !== undefined ? { bio: nextBio } : {}),
        ...(locale !== undefined ? { locale } : {}),
        ...(timezone !== undefined ? { timezone } : {}),
        ...(countryCode !== undefined ? { countryCode } : {}),
      },
    });

    trackEvent({
      eventName: 'profile.updated',
      userId,
      properties: { fields: Object.keys(body) },
    });

    await gamificationService.recordDailyActivity(userId).catch(() => undefined);

    return {
      ...updated,
      educationSummary: extractTagged(updated.bio, 'education'),
      skillsSummary: extractTagged(updated.bio, 'skills'),
    };
  }

  async completeProfile(userId: string, firstNameInput: unknown, lastNameInput: unknown) {
    const firstName = typeof firstNameInput === 'string' ? firstNameInput.trim() : '';
    const lastName = typeof lastNameInput === 'string' ? lastNameInput.trim() : '';
    if (!firstName || !lastName) {
      throw new BadRequestError('First name and last name are required.');
    }
    if (firstName.length > 100 || lastName.length > 100) {
      throw new BadRequestError('First name and last name must be 100 characters or fewer.');
    }

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      if (!existing) {
        throw new NotFoundError('User not found.');
      }
      if (existing.role.name !== ROLES.GUEST) {
        // Idempotent: already upgraded — return current user without error.
        return tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            status: true,
            role: { select: { name: true } },
            profile: true,
          },
        });
      }

      const [userRole, freePlan] = await Promise.all([
        tx.role.findUnique({ where: { name: ROLES.USER } }),
        tx.subscriptionPlan.findUnique({ where: { code: 'FREE' } }),
      ]);
      if (!userRole || !freePlan) {
        throw new NotFoundError('User role or free subscription plan is not configured.');
      }

      const completedAt = new Date();
      const currentPeriodEnd = new Date(completedAt);
      currentPeriodEnd.setUTCFullYear(currentPeriodEnd.getUTCFullYear() + 100);

      await tx.user.update({
        where: { id: userId },
        data: {
          roleId: userRole.id,
          status: 'ACTIVE',
        },
      });
      await tx.userProfile.upsert({
        where: { userId },
        update: {
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
          isComplete: true,
          completedAt,
        },
        create: {
          userId,
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
          isComplete: true,
          completedAt,
        },
      });

      const subscription = await tx.userSubscription.findFirst({
        where: { userId, planId: freePlan.id },
      });
      if (!subscription) {
        await tx.userSubscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: 'ACTIVE',
            currentPeriodStart: completedAt,
            currentPeriodEnd,
          },
        });
      }

      await tx.assessmentAttempt.updateMany({
        where: { userId, resultsLocked: true },
        data: { resultsLocked: false },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          status: true,
          role: { select: { name: true } },
          profile: true,
        },
      });
    });

    await gamificationService.onProfileCompleted(userId).catch(() => undefined);
    await materializeUnlockedResultsForUser(userId).catch(() => undefined);

    trackEvent({
      eventName: 'guest.profile_completed',
      userId,
      properties: { upgradedRole: ROLES.USER },
    });
    // Caller must refresh the access token (POST /auth/refresh) so JWT role becomes USER.
    return user;
  }

  async attachResume(
    userId: string,
    input: { fileName?: string; mimeType?: string; sizeBytes?: number; contentBase64?: string },
  ) {
    const fileName = typeof input.fileName === 'string' ? input.fileName.trim() : '';
    const mimeType = typeof input.mimeType === 'string' ? input.mimeType.trim() : 'application/pdf';
    const sizeBytes =
      typeof input.sizeBytes === 'number'
        ? input.sizeBytes
        : Buffer.byteLength(input.contentBase64 ?? '', 'base64');

    if (!fileName) {
      throw new BadRequestError('fileName is required.');
    }
    if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
      throw new BadRequestError('Resume must be between 1 byte and 10MB.');
    }
    if (!mimeType.includes('pdf') && mimeType !== 'application/msword') {
      throw new BadRequestError('Resume must be a PDF or Word document.');
    }

    // Soft-delete previous resume-like files for this user.
    await prisma.fileObject.updateMany({
      where: {
        uploadedById: userId,
        purpose: 'OTHER',
        deletedAt: null,
        OR: [
          { fileName: { contains: 'resume', mode: 'insensitive' } },
          { mimeType: 'application/pdf' },
        ],
      },
      data: { deletedAt: new Date() },
    });

    const objectKey = `resumes/${userId}/${Date.now()}-${fileName}`;
    const file = await prisma.fileObject.create({
      data: {
        uploadedById: userId,
        bucket: 'hirefast-local',
        objectKey,
        fileName,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        purpose: 'OTHER',
        checksum: input.contentBase64 ? String(input.contentBase64.length) : null,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    trackEvent({
      eventName: 'resume.uploaded',
      userId,
      properties: { fileId: file.id, fileName },
    });

    return {
      ...file,
      sizeBytes: Number(file.sizeBytes),
    };
  }

  async getLatestJrs(userId: string) {
    const jrs = await prisma.jobReadinessScore.findFirst({
      where: { userId },
      orderBy: { calculatedAt: 'desc' },
      include: {
        skillScores: {
          include: { skill: { select: { id: true, code: true, name: true } } },
          orderBy: { score: 'desc' },
        },
        attempt: {
          select: {
            id: true,
            assessment: { select: { title: true, slug: true } },
          },
        },
      },
    });
    if (!jrs) {
      return null;
    }
    trackEvent({ eventName: 'jrs.viewed', userId, properties: { jrsId: jrs.id } });
    return {
      overallScore: Number(jrs.overallScore),
      band: jrs.band,
      version: jrs.version,
      calculatedAt: jrs.calculatedAt,
      attemptId: jrs.attemptId,
      assessmentTitle: jrs.attempt.assessment.title,
      skillScores: jrs.skillScores.map((score) => ({
        skillId: score.skillId,
        skillCode: score.skill.code,
        skillName: score.skill.name,
        score: Number(score.score),
        weight: Number(score.weight),
      })),
    };
  }

  async listMyReports(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.aiReport.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          attempt: {
            select: { id: true, assessment: { select: { title: true, slug: true } } },
          },
        },
      }),
      prisma.aiReport.count({ where: { userId } }),
    ]);

    return {
      items: items.map((report) => ({
        id: report.id,
        title: report.title,
        status: report.status,
        summary: report.summary,
        generatedAt: report.generatedAt,
        attemptId: report.attemptId,
        assessmentTitle: report.attempt?.assessment.title ?? null,
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

  async getReport(userId: string, reportId: string, role: string) {
    const report = await prisma.aiReport.findFirst({
      where: {
        id: reportId,
        ...(role === ROLES.ADMIN ? {} : { userId }),
      },
      include: {
        sections: { orderBy: { sortOrder: 'asc' } },
        attempt: {
          select: {
            id: true,
            resultsLocked: true,
            assessment: { select: { title: true, slug: true } },
          },
        },
      },
    });
    if (!report) {
      throw new NotFoundError('Report not found.');
    }
    if (report.attempt?.resultsLocked) {
      throw new ForbiddenError('Assessment results are locked.', [
        { code: 'RESULTS_LOCKED', message: 'Complete your profile to unlock assessment results.' },
      ]);
    }
    trackEvent({ eventName: 'ai_report.viewed', userId, properties: { reportId } });
    return report;
  }

  async listRecommendations(userId: string) {
    const items = await prisma.learningRecommendation.findMany({
      where: { userId, isDismissed: false, deletedAt: null },
      include: { skill: { select: { code: true, name: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
    trackEvent({
      eventName: 'learning_recommendations.viewed',
      userId,
      properties: { count: items.length },
    });
    return items;
  }

  async dismissRecommendation(userId: string, recommendationId: string) {
    const existing = await prisma.learningRecommendation.findFirst({
      where: { id: recommendationId, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundError('Recommendation not found.');
    }
    return prisma.learningRecommendation.update({
      where: { id: recommendationId },
      data: { isDismissed: true },
    });
  }

  async getSkillAnalytics(userId: string) {
    const history = await prisma.jobReadinessScore.findMany({
      where: { userId },
      orderBy: { calculatedAt: 'asc' },
      include: {
        skillScores: {
          include: { skill: { select: { id: true, code: true, name: true } } },
        },
        attempt: {
          select: {
            id: true,
            assessment: { select: { title: true, accessTier: true } },
          },
        },
      },
    });

    const bySkill = new Map<
      string,
      {
        skillId: string;
        skillCode: string;
        skillName: string;
        scores: Array<{ score: number; calculatedAt: Date; assessmentTitle: string }>;
      }
    >();

    for (const point of history) {
      for (const skillScore of point.skillScores) {
        const key = skillScore.skillId;
        const entry = bySkill.get(key) ?? {
          skillId: skillScore.skillId,
          skillCode: skillScore.skill.code,
          skillName: skillScore.skill.name,
          scores: [],
        };
        entry.scores.push({
          score: Number(skillScore.score),
          calculatedAt: point.calculatedAt,
          assessmentTitle: point.attempt.assessment.title,
        });
        bySkill.set(key, entry);
      }
    }

    const skills = [...bySkill.values()].map((skill) => {
      const latest = skill.scores[skill.scores.length - 1]?.score ?? 0;
      const first = skill.scores[0]?.score ?? latest;
      const average =
        skill.scores.reduce((sum, item) => sum + item.score, 0) / Math.max(1, skill.scores.length);
      return {
        skillId: skill.skillId,
        skillCode: skill.skillCode,
        skillName: skill.skillName,
        latestScore: latest,
        firstScore: first,
        averageScore: Number(average.toFixed(2)),
        delta: Number((latest - first).toFixed(2)),
        samples: skill.scores.length,
        trend: skill.scores,
      };
    });

    skills.sort((a, b) => a.latestScore - b.latestScore);

    trackEvent({
      eventName: 'skill_analytics.viewed',
      userId,
      properties: { skillCount: skills.length },
    });

    await gamificationService.awardBadge(userId, 'SKILL_ANALYST').catch(() => undefined);

    return {
      skills,
      weakest: skills.slice(0, 3),
      strongest: [...skills].sort((a, b) => b.latestScore - a.latestScore).slice(0, 3),
      distribution: {
        ready: skills.filter((s) => s.latestScore >= 80).length,
        developing: skills.filter((s) => s.latestScore >= 60 && s.latestScore < 80).length,
        foundational: skills.filter((s) => s.latestScore < 60).length,
      },
      jrsHistory: history.map((point) => ({
        overallScore: Number(point.overallScore),
        band: point.band,
        calculatedAt: point.calculatedAt,
        assessmentTitle: point.attempt.assessment.title,
        accessTier: point.attempt.assessment.accessTier,
      })),
    };
  }
}

function extractTagged(bio: string | null | undefined, tag: 'education' | 'skills'): string | null {
  if (!bio) return null;
  const match = bio.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/${tag}\\]`, 'i'));
  return match?.[1]?.trim() || null;
}

function stripTagged(bio: string): string {
  return bio
    .replace(/\[education\][\s\S]*?\[\/education\]/gi, '')
    .replace(/\[skills\][\s\S]*?\[\/skills\]/gi, '')
    .trim();
}

function composeTaggedBio(
  core: string | null,
  education: string | null,
  skills: string | null,
): string {
  const parts = [core?.trim() || ''];
  if (education) parts.push(`[education]${education}[/education]`);
  if (skills) parts.push(`[skills]${skills}[/skills]`);
  return parts.filter(Boolean).join('\n\n');
}

export const usersService = new UsersService();
