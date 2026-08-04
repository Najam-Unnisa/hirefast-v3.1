'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  LoadingSpinner,
} from '@hirefast/shared-ui';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';
import { fetchProgress } from '@/services/registered.service';

export function ProgressTrackingPanel(): React.ReactElement {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchProgress>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const progress = await fetchProgress();
        if (!cancelled) {
          setData(progress);
          setLoading(false);
          trackClientEvent('progress_tracking.viewed');
          trackClientEvent('premium.feature_engagement', { feature: 'progress' });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Progress tracking requires an active Premium subscription.',
          );
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading progress…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>Progress unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/premium">Manage Premium</Link>
        </Button>
      </div>
    );
  }

  if (!data?.jrsHistory.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          title="No progress yet"
          description="Complete assessments to build your Job Readiness history."
          action={
            <Button asChild>
              <Link href="/assessments">Browse assessments</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-orange-700 uppercase">Premium</p>
        <h1 className="font-display text-3xl font-semibold">Progress tracking</h1>
        <p className="text-[var(--hf-muted)]">
          Monitor Job Readiness improvements and compare assessment performance over time.
        </p>
      </div>

      <div className="border-y border-[var(--hf-border)] py-6">
        <p className="text-sm text-[var(--hf-muted)]">JRS change</p>
        <p className="font-display text-4xl font-semibold">
          {data.improvement.jrsDelta >= 0 ? '+' : ''}
          {data.improvement.jrsDelta}
        </p>
        <p className="text-sm text-[var(--hf-muted)]">
          Across {data.improvement.points} scored assessments ({data.improvement.direction})
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold">JRS history</h2>
        <ul className="space-y-3">
          {data.jrsHistory.map((point) => (
            <li
              key={`${point.assessmentTitle}-${point.calculatedAt}`}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hf-border)] pt-3 text-sm"
            >
              <div>
                <p className="font-medium">{point.assessmentTitle}</p>
                <p className="text-[var(--hf-muted)]">
                  {new Date(point.calculatedAt).toLocaleDateString()} · {point.accessTier}
                </p>
              </div>
              <p className="font-medium">{Math.round(point.overallScore)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Assessment comparison</h2>
        <ul className="space-y-3">
          {data.assessmentComparisons.map((item) => (
            <li
              key={item.attemptId}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hf-border)] pt-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-[var(--hf-muted)]">
                  {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : '—'} ·{' '}
                  {item.accessTier}
                </p>
              </div>
              <p className="font-medium">
                {item.score != null ? Math.round(item.score) : '—'}
                {item.passed == null ? '' : item.passed ? ' · passed' : ' · not passed'}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
