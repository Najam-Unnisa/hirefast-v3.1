'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  EmptyState,
  LoadingSpinner,
} from '@hirefast/shared-ui';
import { RequireAdmin } from '@/components/guards/require-admin';
import { formatDate, formatNumber, statusBadgeVariant } from '@/lib/format';
import { getAttemptReview, type AttemptReview } from '@/services/admin.service';
import { ApiClientError } from '@/services/api-client';

function AttemptReviewContent(): React.ReactElement {
  const params = useParams();
  const attemptId = String(params.attemptId);
  const [data, setData] = useState<AttemptReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAttemptReview(attemptId));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load attempt.');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading attempt review…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error ?? 'Attempt not found.'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link href="/evaluations" className="text-sm text-[var(--hf-muted)] hover:underline">
          ← Evaluations
        </Link>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">Attempt review</h1>
        <p className="mt-1 text-sm text-[var(--hf-muted)]">
          {data.candidate.email} · {data.assessment.title} ({data.assessment.code})
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={statusBadgeVariant(data.status)}>{data.status}</Badge>
          {data.resultsLocked ? <Badge variant="warning">Results locked</Badge> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4">
          <p className="text-xs uppercase text-[var(--hf-muted)]">Evaluation</p>
          {data.evaluation ? (
            <>
              <Badge className="mt-2" variant={statusBadgeVariant(data.evaluation.status)}>
                {data.evaluation.status}
              </Badge>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {data.evaluation.percentage != null
                  ? formatNumber(data.evaluation.percentage)
                  : '—'}
              </p>
              <p className="text-sm text-[var(--hf-muted)]">
                Passed:{' '}
                {data.evaluation.passed == null ? '—' : data.evaluation.passed ? 'Yes' : 'No'}
              </p>
              {data.evaluation.errorMessage ? (
                <p className="mt-2 text-sm text-[var(--hf-destructive)]">
                  {data.evaluation.errorMessage}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--hf-muted)]">No evaluation yet</p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4">
          <p className="text-xs uppercase text-[var(--hf-muted)]">AI evaluation</p>
          {data.aiEvaluation ? (
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-[var(--hf-muted)]">
              {JSON.stringify(data.aiEvaluation, null, 2)}
            </pre>
          ) : (
            <p className="mt-2 text-sm text-[var(--hf-muted)]">No AI evaluation</p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4">
          <p className="text-xs uppercase text-[var(--hf-muted)]">Job readiness</p>
          {data.jrs ? (
            <>
              <p className="mt-2 font-display text-2xl font-semibold">
                {formatNumber(data.jrs.overallScore)}
              </p>
              <p className="text-sm text-[var(--hf-muted)]">Band: {data.jrs.band ?? '—'}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {data.jrs.skills.map((s) => (
                  <li key={s.skillCode} className="flex justify-between gap-2">
                    <span>{s.skillName}</span>
                    <span className="tabular-nums text-[var(--hf-muted)]">
                      {formatNumber(s.score)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--hf-muted)]">No JRS</p>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--hf-muted)]">
          Responses
        </h2>
        {data.responses.length === 0 ? (
          <EmptyState title="No responses" description="This attempt has no recorded answers." />
        ) : (
          <ul className="divide-y divide-[var(--hf-border)] rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
            {data.responses.map((response) => (
              <li key={response.id} className="space-y-1 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{response.question.code}</Badge>
                  <Badge variant="secondary">{response.question.questionType}</Badge>
                  <span className="text-xs text-[var(--hf-muted)]">
                    {formatDate(response.answeredAt)}
                  </span>
                </div>
                <p className="text-sm font-medium">{response.question.prompt}</p>
                <p className="text-sm text-[var(--hf-muted)]">
                  {response.selectedOption
                    ? `${response.selectedOption.label} (${response.selectedOption.value})`
                    : (response.textAnswer ??
                      (response.numericAnswer != null
                        ? String(response.numericAnswer)
                        : 'No answer'))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AttemptReviewPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <AttemptReviewContent />
    </RequireAdmin>
  );
}
