'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  EmptyState,
  LoadingSpinner,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hirefast/shared-ui';
import { RequireAdmin } from '@/components/guards/require-admin';
import { formatDate, formatNumber, statusBadgeVariant } from '@/lib/format';
import {
  fetchPlatformReport,
  listReports,
  type PageMeta,
  type PlatformReport,
  type ReportListItem,
} from '@/services/admin.service';
import { ApiClientError } from '@/services/api-client';

function ReportsContent(): React.ReactElement {
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [platform, setPlatform] = useState<PlatformReport | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reports, metrics] = await Promise.all([
        listReports({ page, limit: 20 }),
        fetchPlatformReport(),
      ]);
      setItems(reports.items);
      setMeta(reports.meta);
      setPlatform(metrics);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !platform) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading reports…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-[var(--hf-muted)]">
          AI candidate reports and platform-level metrics.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {platform ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4">
            <p className="text-xs uppercase text-[var(--hf-muted)]">User growth (30d)</p>
            <p className="mt-2 font-display text-3xl font-semibold">
              {formatNumber(platform.userGrowthLast30Days)}
            </p>
            <p className="mt-1 text-xs text-[var(--hf-muted)]">
              Guests {formatNumber(platform.guestGrowthLast30Days)} · Registered{' '}
              {formatNumber(platform.registeredGrowthLast30Days)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4">
            <p className="text-xs uppercase text-[var(--hf-muted)]">JRS distribution</p>
            <ul className="mt-2 space-y-1 text-sm">
              {platform.jrsDistribution.map((row) => (
                <li key={row.band} className="flex justify-between gap-2">
                  <span>{row.band}</span>
                  <span className="tabular-nums">{formatNumber(row.count)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4">
            <p className="text-xs uppercase text-[var(--hf-muted)]">Attempt completion</p>
            <ul className="mt-2 space-y-1 text-sm">
              {platform.assessmentCompletion.map((row) => (
                <li key={row.status} className="flex justify-between gap-2">
                  <span>{row.status}</span>
                  <span className="tabular-nums">{formatNumber(row.count)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--hf-muted)]">
          AI reports
        </h2>
        {items.length === 0 ? (
          <EmptyState title="No reports yet" description="Reports appear after AI evaluation." />
        ) : (
          <>
            <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.userEmail}</TableCell>
                      <TableCell>{item.assessmentTitle ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[var(--hf-muted)]">
                        {formatDate(item.generatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {meta ? (
              <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

export default function ReportsPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <ReportsContent />
    </RequireAdmin>
  );
}
