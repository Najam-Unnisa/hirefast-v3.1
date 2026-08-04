import { prisma } from '../../../config/database';
import { createWorker, QUEUE_NAMES } from '../../../jobs';
import { trackEvent } from '../../../services/analytics.service';
import { gamificationService } from '../../../services/gamification.service';

export interface AssessmentEvaluationJob {
  attemptId: string;
}

let registered = false;

async function evaluateAttempt(attemptId: string): Promise<{ percentage: number }> {
  await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: { status: 'EVALUATING' },
  });
  await prisma.attemptEvaluation.upsert({
    where: { attemptId },
    update: { status: 'PROCESSING', errorMessage: null },
    create: { attemptId, status: 'PROCESSING' },
  });

  try {
    const attempt = await prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: {
        assessment: {
          include: {
            questions: {
              where: { deletedAt: null },
              include: { options: true },
            },
            skills: { include: { skill: true } },
          },
        },
        responses: {
          include: { selectedOption: true },
        },
      },
    });

    const responseByQuestion = new Map(
      attempt.responses.map((response) => [response.questionId, response]),
    );
    let totalScore = 0;
    let maxScore = 0;

    for (const question of attempt.assessment.questions) {
      const points = Number(question.points);
      maxScore += points;
      const response = responseByQuestion.get(question.id);
      if (!response) continue;

      if (question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'TRUE_FALSE') {
        if (response.selectedOption?.isCorrect) {
          totalScore += points;
        }
      } else if (question.questionType === 'SHORT_TEXT' && response.textAnswer?.trim()) {
        totalScore += points * 0.5;
      }
    }

    const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(2)) : 0;
    const passingScore = Number(attempt.assessment.passingScore ?? 60);
    const passed = percentage >= passingScore;
    const evaluatedAt = new Date();
    const band = percentage >= 80 ? 'READY' : percentage >= 60 ? 'DEVELOPING' : 'FOUNDATIONAL';

    const strengths = passed
      ? [
          'Clear structure in workplace communication responses',
          'Demonstrated professional tone in written prompts',
        ]
      : ['Willingness to complete a full communication assessment'];
    const weaknesses = passed
      ? ['Can deepen clarity when requesting action under time pressure']
      : [
          'Communication clarity needs more practice',
          'Professional phrasing can be more concise and specific',
        ];
    const summary = passed
      ? 'Your communication fundamentals are developing well. Continue refining clarity and audience awareness.'
      : 'Your results highlight clear opportunities to strengthen workplace communication basics.';

    const strengthsText = strengths.map((item) => `• ${item}`).join('\n');
    const weaknessesText = weaknesses.map((item) => `• ${item}`).join('\n');

    await prisma.$transaction(async (tx) => {
      await tx.attemptEvaluation.upsert({
        where: { attemptId },
        update: {
          status: 'COMPLETED',
          totalScore,
          maxScore,
          percentage,
          passed,
          evaluatedAt,
          errorMessage: null,
        },
        create: {
          attemptId,
          status: 'COMPLETED',
          totalScore,
          maxScore,
          percentage,
          passed,
          evaluatedAt,
        },
      });

      await tx.aiEvaluation.upsert({
        where: { attemptId },
        update: {
          status: 'COMPLETED',
          provider: 'hirefast-stub',
          model: 'deterministic-v1',
          summary,
          strengths: strengthsText,
          weaknesses: weaknessesText,
          rawResponse: { summary, strengths, weaknesses, percentage },
          processedAt: evaluatedAt,
          errorMessage: null,
        },
        create: {
          attemptId,
          status: 'COMPLETED',
          provider: 'hirefast-stub',
          model: 'deterministic-v1',
          summary,
          strengths: strengthsText,
          weaknesses: weaknessesText,
          rawResponse: { summary, strengths, weaknesses, percentage },
          processedAt: evaluatedAt,
        },
      });

      await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'COMPLETED',
          completedAt: evaluatedAt,
        },
      });

      await upsertUnlockedResults({
        tx,
        attemptId,
        userId: attempt.userId,
        percentage,
        band,
        evaluatedAt,
        summary,
        strengths,
        weaknesses,
        assessmentTitle: attempt.assessment.title,
        skills: attempt.assessment.skills,
      });
    });

    // Gamification is a registered-user concern; skip while results remain locked.
    if (!attempt.resultsLocked) {
      await gamificationService.onAssessmentCompleted(
        attempt.userId,
        attemptId,
        attempt.assessment.code,
      );
    }

    trackEvent({
      eventName: 'evaluation.completed',
      userId: attempt.userId,
      properties: { attemptId, percentage, resultsLocked: attempt.resultsLocked },
    });
    return { percentage };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assessment evaluation failed.';
    await prisma.$transaction([
      prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { status: 'FAILED' },
      }),
      prisma.attemptEvaluation.upsert({
        where: { attemptId },
        update: { status: 'FAILED', errorMessage: message },
        create: { attemptId, status: 'FAILED', errorMessage: message },
      }),
      prisma.aiEvaluation.upsert({
        where: { attemptId },
        update: {
          status: 'FAILED',
          provider: 'hirefast-stub',
          errorMessage: message,
        },
        create: {
          attemptId,
          status: 'FAILED',
          provider: 'hirefast-stub',
          errorMessage: message,
        },
      }),
    ]);
    trackEvent({
      eventName: 'evaluation.failed',
      properties: { attemptId, message },
    });
    throw error;
  }
}

async function upsertUnlockedResults(input: {
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  attemptId: string;
  userId: string;
  percentage: number;
  band: string;
  evaluatedAt: Date;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  assessmentTitle: string;
  skills: Array<{ skillId: string; weight: unknown; skill: { name: string; code: string } }>;
}) {
  const {
    tx,
    attemptId,
    userId,
    percentage,
    band,
    evaluatedAt,
    summary,
    strengths,
    weaknesses,
    assessmentTitle,
    skills,
  } = input;

  const jrs = await tx.jobReadinessScore.upsert({
    where: { attemptId },
    update: {
      overallScore: percentage,
      band,
      calculatedAt: evaluatedAt,
    },
    create: {
      attemptId,
      userId,
      overallScore: percentage,
      band,
      calculatedAt: evaluatedAt,
    },
  });

  for (const assessmentSkill of skills) {
    const weight = Number(assessmentSkill.weight) || 1;
    const skillVariance = (assessmentSkill.skill.code.length % 5) - 2;
    const skillScore = Math.min(100, Math.max(0, Number((percentage + skillVariance).toFixed(2))));
    await tx.jrsSkillScore.upsert({
      where: {
        jobReadinessScoreId_skillId: {
          jobReadinessScoreId: jrs.id,
          skillId: assessmentSkill.skillId,
        },
      },
      update: { score: skillScore, weight },
      create: {
        jobReadinessScoreId: jrs.id,
        skillId: assessmentSkill.skillId,
        score: skillScore,
        weight,
      },
    });
  }

  const existingReport = await tx.aiReport.findFirst({
    where: { attemptId, userId },
  });

  const report =
    existingReport ??
    (await tx.aiReport.create({
      data: {
        userId,
        attemptId,
        status: 'READY',
        title: `${assessmentTitle} Report`,
        provider: 'hirefast-stub',
        model: 'deterministic-v1',
        summary,
        generatedAt: evaluatedAt,
      },
    }));

  if (existingReport) {
    await tx.aiReport.update({
      where: { id: existingReport.id },
      data: {
        status: 'READY',
        summary,
        generatedAt: evaluatedAt,
        errorMessage: null,
      },
    });
    await tx.aiReportSection.deleteMany({ where: { reportId: existingReport.id } });
  }

  const sections = [
    {
      sectionKey: 'summary',
      title: 'Summary',
      content: summary,
      sortOrder: 1,
    },
    {
      sectionKey: 'strengths',
      title: 'Strengths',
      content: strengths.map((item) => `• ${item}`).join('\n'),
      sortOrder: 2,
    },
    {
      sectionKey: 'weaknesses',
      title: 'Weaknesses',
      content: weaknesses.map((item) => `• ${item}`).join('\n'),
      sortOrder: 3,
    },
    {
      sectionKey: 'improvement',
      title: 'Improvement Areas',
      content: weaknesses.map((item) => `• Practice: ${item}`).join('\n'),
      sortOrder: 4,
    },
    {
      sectionKey: 'recommendations',
      title: 'Personalized Recommendations',
      content: [
        '• Revisit unclear prompts and rewrite them with a clear ask and deadline.',
        '• Practice active listening summaries before proposing solutions.',
        '• Keep workplace messages concise — one purpose per message.',
      ].join('\n'),
      sortOrder: 5,
    },
  ];

  await tx.aiReportSection.createMany({
    data: sections.map((section) => ({
      reportId: report.id,
      ...section,
    })),
  });

  // Freemium improvement tips (basic recommendations). Premium learning modules stay gated elsewhere.
  await tx.learningRecommendation.deleteMany({
    where: { userId, source: 'assessment_evaluation', deletedAt: null },
  });

  const recommendationSkills = skills.slice(0, 3);
  for (const [index, assessmentSkill] of recommendationSkills.entries()) {
    await tx.learningRecommendation.create({
      data: {
        userId,
        skillId: assessmentSkill.skillId,
        title: `Improve ${assessmentSkill.skill.name}`,
        description: `Based on your ${assessmentTitle} results, focus on practical drills for ${assessmentSkill.skill.name.toLowerCase()}.`,
        priority: index + 1,
        source: 'assessment_evaluation',
      },
    });
  }
}

/**
 * After guest unlock, backfill any missing JRS/report artifacts and award gamification
 * that was skipped while resultsLocked was true.
 */
export async function materializeUnlockedResultsForUser(userId: string): Promise<void> {
  const unlockedCompleted = await prisma.assessmentAttempt.findMany({
    where: {
      userId,
      resultsLocked: false,
      status: { in: ['COMPLETED', 'SUBMITTED', 'EVALUATING'] },
      evaluation: { status: 'COMPLETED' },
    },
    include: {
      evaluation: true,
      aiEvaluation: true,
      jobReadinessScore: true,
      assessment: {
        include: { skills: { include: { skill: true } } },
      },
    },
  });

  for (const attempt of unlockedCompleted) {
    if (!attempt.jobReadinessScore) {
      const percentage = Number(attempt.evaluation?.percentage ?? 0);
      const band = percentage >= 80 ? 'READY' : percentage >= 60 ? 'DEVELOPING' : 'FOUNDATIONAL';
      const strengths = parseBulletList(attempt.aiEvaluation?.strengths) ?? [
        'Completed assessment',
      ];
      const weaknesses = parseBulletList(attempt.aiEvaluation?.weaknesses) ?? [
        'Continue practicing',
      ];
      const summary =
        attempt.aiEvaluation?.summary ??
        'Assessment evaluation completed. Review your report for details.';

      await prisma.$transaction(async (tx) => {
        await upsertUnlockedResults({
          tx,
          attemptId: attempt.id,
          userId,
          percentage,
          band,
          evaluatedAt: new Date(),
          summary,
          strengths,
          weaknesses,
          assessmentTitle: attempt.assessment.title,
          skills: attempt.assessment.skills,
        });
      });
    }

    if (attempt.status !== 'COMPLETED') {
      await prisma.assessmentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    await gamificationService.onAssessmentCompleted(userId, attempt.id, attempt.assessment.code);
  }
}

export function registerAssessmentWorkers(): void {
  if (registered) return;
  createWorker<AssessmentEvaluationJob, { percentage: number }>(
    QUEUE_NAMES.AI_EVALUATION,
    async (job) => evaluateAttempt(job.data.attemptId),
  );
  registered = true;
}

function parseBulletList(value: string | null | undefined): string[] | null {
  if (!value?.trim()) return null;
  return value
    .split('\n')
    .map((line) => line.replace(/^•\s*/, '').trim())
    .filter(Boolean);
}
