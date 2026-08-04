'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  LoadingSpinner,
} from '@hirefast/shared-ui';
import { saveAttemptId } from '@/lib/session';
import { useSession } from '@/providers/session-provider';
import {
  getAttempt,
  getQuestions,
  saveResponse,
  submitAttempt,
  type AssessmentQuestion,
} from '@/services/assessments.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

interface AnswerState {
  selectedOptionId?: string | null;
  textAnswer?: string | null;
}

interface AssessmentPlayerProps {
  attemptId: string;
}

export function AssessmentPlayer({ attemptId }: AssessmentPlayerProps): React.ReactElement {
  const router = useRouter();
  const { isGuest } = useSession();
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const [attempt, questionList] = await Promise.all([
          getAttempt(attemptId),
          getQuestions(attemptId),
        ]);

        if (attempt.status === 'COMPLETED' && !isGuest && !attempt.resultsLocked) {
          router.replace(`/assessment/${attemptId}/results`);
          return;
        }

        if (
          attempt.status === 'SUBMITTED' ||
          attempt.status === 'EVALUATING' ||
          attempt.status === 'COMPLETED'
        ) {
          router.replace(`/assessment/${attemptId}/processing`);
          return;
        }
        if (attempt.status !== 'IN_PROGRESS') {
          router.replace(isGuest ? '/welcome' : '/assessments');
          return;
        }

        saveAttemptId(attemptId);
        const restored: Record<string, AnswerState> = {};
        for (const response of attempt.responses ?? []) {
          restored[response.questionId] = {
            selectedOptionId: response.selectedOptionId,
            textAnswer: response.textAnswer,
          };
        }

        if (!cancelled) {
          setQuestions(questionList);
          setAnswers(restored);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setSubmitError(
            err instanceof ApiClientError ? err.message : 'Unable to load this assessment.',
          );
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [attemptId, router, isGuest]);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const current = questions[index];
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

  const unansweredRequired = useMemo(() => {
    return questions.filter((question) => {
      if (!question.isRequired) return false;
      const answer = answers[question.id];
      if (!answer) return true;
      if (question.questionType === 'SHORT_TEXT' || question.questionType === 'LONG_TEXT') {
        return !answer.textAnswer?.trim();
      }
      return !answer.selectedOptionId;
    });
  }, [answers, questions]);

  const persistAnswer = useCallback(
    async (questionId: string, next: AnswerState) => {
      setSaving(true);
      setSaveError(null);
      try {
        await saveResponse(attemptId, questionId, next);
        trackClientEvent('assessment.auto_saved', { attemptId, questionId });
      } catch (err) {
        setSaveError(
          err instanceof ApiClientError
            ? err.message
            : 'Auto-save failed. Check your connection and continue — we will retry.',
        );
      } finally {
        setSaving(false);
      }
    },
    [attemptId],
  );

  function scheduleSave(questionId: string, next: AnswerState): void {
    if (saveTimers.current[questionId]) {
      clearTimeout(saveTimers.current[questionId]);
    }
    saveTimers.current[questionId] = setTimeout(() => {
      void persistAnswer(questionId, next);
    }, 450);
  }

  function updateAnswer(questionId: string, patch: AnswerState): void {
    setAnswers((prev) => {
      const next = { ...prev[questionId], ...patch };
      scheduleSave(questionId, next);
      return { ...prev, [questionId]: next };
    });
  }

  async function handleSubmit(): Promise<void> {
    if (unansweredRequired.length > 0) {
      setSubmitError('Please answer all required questions before submitting.');
      setConfirmSubmit(false);
      const firstMissing = questions.findIndex((q) => q.id === unansweredRequired[0]?.id);
      if (firstMissing >= 0) setIndex(firstMissing);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitAttempt(attemptId);
      trackClientEvent('assessment.submitted', { attemptId });
      trackClientEvent('assessment.completed', { attemptId });
      trackClientEvent('evaluation.started', { attemptId });
      router.push(`/assessment/${attemptId}/processing`);
    } catch (err) {
      setSubmitting(false);
      setConfirmSubmit(false);
      setSubmitError(
        err instanceof ApiClientError ? err.message : 'Submission failed. Please try again.',
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading questions…" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>No questions available</AlertTitle>
          <AlertDescription>
            {submitError ?? 'This assessment has no published questions yet.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const answer = answers[current.id] ?? {};

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 space-y-3">
        <div className="flex items-center justify-between gap-4 text-sm text-[var(--hf-muted)]">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span aria-live="polite">{saving ? 'Saving…' : saveError ? 'Save issue' : 'Saved'}</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--hf-border)]"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full bg-teal-600"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {current.prompt}
          </h1>
          {current.isRequired ? <p className="text-sm text-[var(--hf-muted)]">Required</p> : null}

          {current.questionType === 'SHORT_TEXT' || current.questionType === 'LONG_TEXT' ? (
            <Input
              value={answer.textAnswer ?? ''}
              onChange={(event) => updateAnswer(current.id, { textAnswer: event.target.value })}
              placeholder="Type your answer"
              aria-label="Text answer"
            />
          ) : (
            <ul className="space-y-3">
              {current.options.map((option) => {
                const selected = answer.selectedOptionId === option.id;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => updateAnswer(current.id, { selectedOptionId: option.id })}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                        selected
                          ? 'border-teal-600 bg-teal-50 text-teal-950'
                          : 'border-[var(--hf-border)] hover:border-teal-500/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>

      {saveError ? (
        <Alert className="mt-6" variant="destructive">
          <AlertTitle>Auto-save failed</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}

      {submitError ? (
        <Alert className="mt-6" variant="destructive">
          <AlertTitle>Submission issue</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={index === 0 || submitting}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
        >
          Previous
        </Button>
        {index < questions.length - 1 ? (
          <Button
            type="button"
            disabled={submitting}
            onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
          >
            Next
          </Button>
        ) : confirmSubmit ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmSubmit(false)}>
              Review answers
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? 'Submitting…' : 'Confirm submit'}
            </Button>
          </div>
        ) : (
          <Button type="button" disabled={submitting} onClick={() => setConfirmSubmit(true)}>
            Submit assessment
          </Button>
        )}
      </div>
    </section>
  );
}
