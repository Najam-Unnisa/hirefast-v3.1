'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';
import { getAttemptStatus } from '@/services/assessments.service';
import { apiClient } from '@/services/api-client';

interface ResultsView {
  jrs: {
    overallScore: number;
    band: string | null;
    skillScores: Array<{ skillName: string; score: number }>;
  } | null;
  ai: { summary: string | null; strengths: string | null; weaknesses: string | null } | null;
  reports: Array<{ id: string; title: string }>;
}

export function AttemptResults(): React.ReactElement {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const [data, setData] = useState<ResultsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const status = await getAttemptStatus(attemptId);
        if (status.resultsLocked) {
          window.location.assign(`/results-locked?attemptId=${attemptId}`);
          return;
        }
        const [jrs, ai, reports] = await Promise.all([
          apiClient.get<ResultsView['jrs']>(`/attempts/${attemptId}/jrs`).catch(() => null),
          apiClient
            .get<ResultsView['ai']>(`/attempts/${attemptId}/ai-evaluation`)
            .catch(() => null),
          apiClient
            .get<Array<{ id: string; title: string }>>(`/attempts/${attemptId}/reports`)
            .catch(() => []),
        ]);
        if (!cancelled) {
          setData({ jrs, ai, reports: reports ?? [] });
          setLoading(false);
          trackClientEvent('jrs.viewed', { attemptId });
          trackClientEvent('skill_scores.viewed', { attemptId });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to load results.');
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading results…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>Results unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">Assessment results</h1>
        <p className="text-[var(--hf-muted)]">Your scores and AI explanation for this attempt.</p>
      </div>

      <div className="space-y-2 border-y border-[var(--hf-border)] py-6">
        <p className="text-sm text-[var(--hf-muted)]">Job Readiness Score</p>
        <p className="font-display text-5xl font-semibold text-teal-800">
          {data?.jrs ? Math.round(data.jrs.overallScore) : '—'}
        </p>
        <p className="text-sm text-[var(--hf-muted)]">{data?.jrs?.band ?? 'Pending'}</p>
      </div>

      {data?.jrs?.skillScores?.length ? (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Skill scores</h2>
          <ul className="space-y-3">
            {data.jrs.skillScores.map((skill) => (
              <li key={skill.skillName} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{skill.skillName}</span>
                  <span>{Math.round(skill.score)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--hf-border)]">
                  <div
                    className="h-full bg-teal-600"
                    style={{ width: `${Math.min(100, skill.score)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold">AI summary</h2>
        <p className="text-[var(--hf-muted)]">
          {data?.ai?.summary ?? 'AI summary will appear when evaluation finishes.'}
        </p>
        {data?.ai?.strengths ? (
          <div>
            <h3 className="font-medium">Strengths</h3>
            <p className="whitespace-pre-line text-sm text-[var(--hf-muted)]">
              {data.ai.strengths}
            </p>
          </div>
        ) : null}
        {data?.ai?.weaknesses ? (
          <div>
            <h3 className="font-medium">Improvement areas</h3>
            <p className="whitespace-pre-line text-sm text-[var(--hf-muted)]">
              {data.ai.weaknesses}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports">All reports</Link>
        </Button>
      </div>
    </section>
  );
}
