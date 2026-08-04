import { prisma } from '../../../config/database';
import { createWorker, QUEUE_NAMES } from '../../../jobs';
import { trackEvent } from '../../../services/analytics.service';

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
    const evaluatedAt = new Date();
    const summary = {
      overview: 'Automated communication assessment evaluation completed.',
      percentage,
      note: 'Qualitative feedback is a placeholder for a future AI provider.',
    };

    await prisma.$transaction(async (tx) => {
      await tx.attemptEvaluation.upsert({
        where: { attemptId },
        update: {
          status: 'COMPLETED',
          totalScore,
          maxScore,
          percentage,
          passed: percentage >= passingScore,
          evaluatedAt,
          errorMessage: null,
        },
        create: {
          attemptId,
          status: 'COMPLETED',
          totalScore,
          maxScore,
          percentage,
          passed: percentage >= passingScore,
          evaluatedAt,
        },
      });
      await tx.aiEvaluation.upsert({
        where: { attemptId },
        update: {
          status: 'COMPLETED',
          provider: 'hirefast-stub',
          model: 'deterministic-v1',
          summary: summary.overview,
          rawResponse: summary,
          processedAt: evaluatedAt,
          errorMessage: null,
        },
        create: {
          attemptId,
          status: 'COMPLETED',
          provider: 'hirefast-stub',
          model: 'deterministic-v1',
          summary: summary.overview,
          rawResponse: summary,
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

      // Always persist JRS; RESULTS_LOCKED gates visibility on read, not persistence.
      await tx.jobReadinessScore.upsert({
        where: { attemptId },
        update: {
          overallScore: percentage,
          band: percentage >= 80 ? 'READY' : percentage >= 60 ? 'DEVELOPING' : 'FOUNDATIONAL',
          calculatedAt: evaluatedAt,
        },
        create: {
          attemptId,
          userId: attempt.userId,
          overallScore: percentage,
          band: percentage >= 80 ? 'READY' : percentage >= 60 ? 'DEVELOPING' : 'FOUNDATIONAL',
          calculatedAt: evaluatedAt,
        },
      });
    });

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

export function registerAssessmentWorkers(): void {
  if (registered) return;
  createWorker<AssessmentEvaluationJob, { percentage: number }>(
    QUEUE_NAMES.AI_EVALUATION,
    async (job) => evaluateAttempt(job.data.attemptId),
  );
  registered = true;
}
