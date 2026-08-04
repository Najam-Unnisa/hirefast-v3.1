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
import { ApiClientError } from '@/services/api-client';
import { fetchMyAttempts } from '@/services/registered.service';

export function AssessmentHistory(): React.ReactElement {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchMyAttempts>>['items']>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const result = await fetchMyAttempts(page, 10);
        if (!cancelled) {
          setItems(result.items);
          setHasNext(result.meta.hasNextPage);
          setHasPrev(result.meta.hasPreviousPage);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to load history.');
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-3xl font-semibold">Assessment history</h1>
        <p className="text-[var(--hf-muted)]">Review past attempts, scores, and reports.</p>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading history…" />
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>History unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !items.length ? (
        <EmptyState
          title="No assessments yet"
          description="Complete a free assessment to start building your history."
          action={
            <Button asChild>
              <Link href="/assessments">Browse assessments</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-5">
          {items.map((item) => (
            <li key={item.id} className="space-y-2 border-t border-[var(--hf-border)] pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.assessmentTitle}</p>
                  <p className="text-sm text-[var(--hf-muted)]">
                    {item.status}
                    {item.completedAt
                      ? ` · ${new Date(item.completedAt).toLocaleDateString()}`
                      : item.startedAt
                        ? ` · started ${new Date(item.startedAt).toLocaleDateString()}`
                        : ''}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {item.jrs
                    ? `JRS ${Math.round(item.jrs.overallScore)}`
                    : item.score != null
                      ? `Score ${Math.round(item.score)}`
                      : '—'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status === 'IN_PROGRESS' ? (
                  <Button asChild size="sm">
                    <Link href={`/assessment/${item.id}`}>Resume</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/assessment/${item.id}/results`}>View results</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/reports">Reports</Link>
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!hasPrev || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasNext || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  );
}
