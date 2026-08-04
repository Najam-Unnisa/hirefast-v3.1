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
import { fetchMyReports, fetchReport } from '@/services/registered.service';

export function ReportsList(): React.ReactElement {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchMyReports>>['items']>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchReport>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const result = await fetchMyReports();
        if (!cancelled) {
          setItems(result.items);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to load reports.');
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    async function loadDetail(): Promise<void> {
      try {
        const report = await fetchReport(selectedId!);
        if (!cancelled) {
          setDetail(report);
          trackClientEvent('ai_report.viewed', { reportId: selectedId });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to open report.');
        }
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading reports…" />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-3xl font-semibold">AI assessment reports</h1>
        <p className="text-[var(--hf-muted)]">
          Qualitative insights that explain your results without changing numerical scores.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Reports issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!items.length ? (
        <EmptyState
          title="No reports yet"
          description="Complete a free assessment to generate your first AI report."
          action={
            <Button asChild>
              <Link href="/assessments">Take an assessment</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full border-t border-[var(--hf-border)] py-3 text-left ${
                    selectedId === item.id ? 'text-teal-800' : ''
                  }`}
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-[var(--hf-muted)]">
                    {item.assessmentTitle ?? 'Assessment'} · {item.status}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-4">
            {detail ? (
              <>
                <h2 className="font-display text-2xl font-semibold">{detail.title}</h2>
                {detail.summary ? <p className="text-[var(--hf-muted)]">{detail.summary}</p> : null}
                {detail.sections.map((section) => (
                  <div
                    key={section.sectionKey}
                    className="space-y-2 border-t border-[var(--hf-border)] pt-4"
                  >
                    <h3 className="font-medium">{section.title}</h3>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--hf-muted)]">
                      {section.content}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-[var(--hf-muted)]">
                Select a report to read the full analysis.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
