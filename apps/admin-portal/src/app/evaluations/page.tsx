'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
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
  listEvaluations,
  retryEvaluation,
  type EvaluationListItem,
  type PageMeta,
} from '@/services/admin.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

function EvaluationsContent(): React.ReactElement {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EvaluationListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listEvaluations({
        status: status || undefined,
        page,
        limit: 20,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load evaluations.');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRetry(attemptId: string): Promise<void> {
    setRetrying(attemptId);
    setError(null);
    try {
      await retryEvaluation(attemptId);
      trackClientEvent('admin.evaluation_retry', { attemptId });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Retry failed.');
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Evaluations</h1>
        <p className="mt-1 text-sm text-[var(--hf-muted)]">
          Monitor evaluation jobs, retry failures, and review attempts.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: '', label: 'All' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'PROCESSING', label: 'Processing' },
          { value: 'FAILED', label: 'Failed' },
          { value: 'COMPLETED', label: 'Completed' },
        ].map((opt) => (
          <Button
            key={opt.value || 'all'}
            type="button"
            size="sm"
            variant={status === opt.value ? 'default' : 'outline'}
            onClick={() => {
              setPage(1);
              setStatus(opt.value);
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <LoadingSpinner label="Loading evaluations…" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No evaluations" description="Nothing matches this filter." />
      ) : (
        <>
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>AI</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.candidateEmail}</TableCell>
                    <TableCell>{item.assessmentTitle}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.percentage != null ? formatNumber(item.percentage) : '—'}
                    </TableCell>
                    <TableCell>{item.aiStatus ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-[var(--hf-muted)]">
                      {formatDate(item.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/evaluations/${item.attemptId}`}>Review</Link>
                        </Button>
                        {item.status === 'FAILED' || item.status === 'PENDING' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={retrying === item.attemptId}
                            onClick={() => void handleRetry(item.attemptId)}
                          >
                            {retrying === item.attemptId ? '…' : 'Retry'}
                          </Button>
                        ) : null}
                      </div>
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
    </div>
  );
}

export default function EvaluationsPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <EvaluationsContent />
    </RequireAdmin>
  );
}
