'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';
import {
  listAssessments,
  startAttempt,
  type GuestAssessmentSummary,
} from '@/services/assessments.service';
import { saveAttemptId } from '@/lib/session';

type CatalogItem = GuestAssessmentSummary & {
  locked?: boolean;
  upgradeRequired?: boolean;
  accessTier?: string;
};

export function AssessmentCatalog(): React.ReactElement {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const list = (await listAssessments()) as CatalogItem[];
        if (!cancelled) {
          setItems(list);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to load assessments.');
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStart(assessment: CatalogItem): Promise<void> {
    if (assessment.locked || assessment.upgradeRequired) {
      trackClientEvent('premium.upgrade_cta_clicked', { source: 'assessment_catalog' });
      router.push('/premium');
      return;
    }
    setStartingId(assessment.id);
    setError(null);
    try {
      const attempt = await startAttempt(assessment.id);
      saveAttemptId(attempt.id);
      trackClientEvent('assessment.started', {
        attemptId: attempt.id,
        accessTier: assessment.accessTier,
      });
      if (assessment.accessTier === 'PREMIUM') {
        trackClientEvent('premium.assessment_started', {
          attemptId: attempt.id,
          assessmentId: assessment.id,
        });
      }
      router.push(`/assessment/${attempt.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        const premium = err.errors.some((item) => item.code === 'PREMIUM_REQUIRED');
        if (premium) {
          trackClientEvent('premium.upgrade_cta_clicked', { source: 'assessment_start_blocked' });
          router.push('/premium');
          return;
        }
        setError(err.message);
      } else {
        setError('Could not start assessment.');
      }
      setStartingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading assessments…" />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-3xl font-semibold">Assessments</h1>
        <p className="text-[var(--hf-muted)]">
          Configuration-driven catalog of General and Premium assessments. Premium items unlock
          automatically with an active subscription.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <ul className="space-y-6">
        {items.map((assessment, index) => {
          const locked = Boolean(assessment.locked || assessment.upgradeRequired);
          return (
            <motion.li
              key={assessment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-3 border-t border-[var(--hf-border)] pt-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-semibold">{assessment.title}</h2>
                  <p className="text-sm text-[var(--hf-muted)]">
                    {assessment.description ?? 'Employability assessment'}
                  </p>
                  <p className="text-xs text-[var(--hf-muted)]">
                    {assessment.durationMinutes ?? 10} min · {assessment._count.questions} questions
                    · {assessment.accessTier ?? 'FREE'}
                  </p>
                </div>
                {locked ? (
                  <span className="inline-flex items-center gap-1 text-sm text-orange-700">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    Premium
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={startingId === assessment.id}
                  variant={locked ? 'outline' : 'default'}
                  onClick={() => void handleStart(assessment)}
                >
                  {locked
                    ? 'Unlock with Premium'
                    : startingId === assessment.id
                      ? 'Starting…'
                      : 'Start / Resume'}
                </Button>
                {locked ? (
                  <Button asChild variant="ghost">
                    <Link href="/premium">Learn more</Link>
                  </Button>
                ) : null}
              </div>
            </motion.li>
          );
        })}
      </ul>

      {!items.length ? (
        <p className="text-sm text-[var(--hf-muted)]">No published assessments yet.</p>
      ) : null}
    </section>
  );
}
