'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock3, ListChecks, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { GUEST_ASSESSMENT_SLUG } from '@/constants/app';
import { saveAttemptId, getAttemptId } from '@/lib/session';
import { useSession } from '@/providers/session-provider';
import {
  getAttempt,
  getAssessmentBySlug,
  listAssessments,
  startAttempt,
  type GuestAssessmentSummary,
} from '@/services/assessments.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

export function WelcomePanel(): React.ReactElement {
  const router = useRouter();
  const { user } = useSession();
  const [assessment, setAssessment] = useState<GuestAssessmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const storedAttemptId = getAttemptId();
        if (storedAttemptId) {
          try {
            const attempt = await getAttempt(storedAttemptId);
            if (
              attempt.status === 'SUBMITTED' ||
              attempt.status === 'EVALUATING' ||
              attempt.status === 'COMPLETED'
            ) {
              router.replace(`/results-locked?attemptId=${attempt.id}`);
              return;
            }
            if (attempt.status === 'IN_PROGRESS') {
              router.replace(`/assessment/${attempt.id}`);
              return;
            }
          } catch {
            // Fall through to catalog load if stored attempt is invalid.
          }
        }

        const next = await getAssessmentBySlug(GUEST_ASSESSMENT_SLUG).catch(async () => {
          const list = await listAssessments();
          return list[0] ?? null;
        });
        if (!cancelled) {
          setAssessment(next);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Unable to load the guest assessment right now.',
          );
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleBegin(): Promise<void> {
    if (!assessment) return;
    setStarting(true);
    setError(null);
    try {
      const attempt = await startAttempt(assessment.id);
      saveAttemptId(attempt.id);
      trackClientEvent('assessment.started', {
        attemptId: attempt.id,
        assessmentId: assessment.id,
      });
      router.push(`/assessment/${attempt.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        const retake = err.errors.some((item) => item.code === 'GUEST_RETAKE_NOT_ALLOWED');
        if (retake) {
          router.push('/results-locked');
          return;
        }
        setError(err.message);
      } else {
        setError('Could not start the assessment. Please try again.');
      }
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Preparing your welcome…" />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-8"
      >
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-wide text-teal-700 uppercase">Welcome</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-lg text-[var(--hf-muted)]">
            You are one assessment away from seeing how HireFast evaluates workplace communication.
            Your detailed report unlocks after a quick registration.
          </p>
        </div>

        {assessment ? (
          <div className="space-y-6 border-y border-[var(--hf-border)] py-8">
            <h2 className="font-display text-2xl font-semibold">{assessment.title}</h2>
            <p className="text-[var(--hf-muted)]">
              {assessment.description ??
                'Measure clarity, tone, and professional communication fundamentals.'}
            </p>
            <ul className="grid gap-4 sm:grid-cols-3">
              <li className="flex gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 text-teal-700" aria-hidden="true" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-sm text-[var(--hf-muted)]">
                    About {assessment.durationMinutes ?? 10} minutes
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <ListChecks className="mt-0.5 h-5 w-5 text-teal-700" aria-hidden="true" />
                <div>
                  <p className="font-medium">Questions</p>
                  <p className="text-sm text-[var(--hf-muted)]">
                    {assessment._count.questions} prompts
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-teal-700" aria-hidden="true" />
                <div>
                  <p className="font-medium">Progress saved</p>
                  <p className="text-sm text-[var(--hf-muted)]">Resume if interrupted</p>
                </div>
              </li>
            </ul>
            {assessment.instructions ? (
              <div className="space-y-2">
                <h3 className="font-medium">Instructions</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--hf-muted)]">
                  {assessment.instructions}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertTitle>Assessment unavailable</AlertTitle>
            <AlertDescription>
              The General Communication Assessment is not published yet. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to continue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="button"
          size="lg"
          onClick={() => void handleBegin()}
          disabled={!assessment || starting}
        >
          {starting ? 'Starting assessment…' : 'Begin assessment'}
        </Button>
      </motion.div>
    </section>
  );
}
