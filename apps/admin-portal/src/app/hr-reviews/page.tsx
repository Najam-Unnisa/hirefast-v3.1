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
  Input,
  Label,
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
import { formatDate, statusBadgeVariant } from '@/lib/format';
import {
  createHrReview,
  listHrReviews,
  patchHrReview,
  type HrReviewListItem,
  type PageMeta,
} from '@/services/admin.service';
import { ApiClientError } from '@/services/api-client';

const HR_STATUSES = ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'];

function HrReviewsContent(): React.ReactElement {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HrReviewListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listHrReviews({
        status: status || undefined,
        page,
        limit: 20,
      });
      setItems(result.items);
      setMeta(result.meta);
      const drafts: Record<string, string> = {};
      for (const item of result.items) {
        drafts[item.id] = item.notes ?? '';
      }
      setNoteDrafts(drafts);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load HR reviews.');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      await createHrReview({
        attemptId: attemptId.trim(),
        notes: notes.trim() || undefined,
      });
      setAttemptId('');
      setNotes('');
      setMessage('HR review created.');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed.');
    } finally {
      setCreating(false);
    }
  }

  async function updateReview(reviewId: string, nextStatus: string): Promise<void> {
    setUpdatingId(reviewId);
    setError(null);
    setMessage(null);
    try {
      await patchHrReview(reviewId, {
        status: nextStatus,
        notes: noteDrafts[reviewId],
      });
      setMessage(`Review updated to ${nextStatus}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">HR reviews</h1>
        <p className="mt-1 text-sm text-[var(--hf-muted)]">
          Queue of human reviews for assessment attempts.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="grid gap-3 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4 sm:grid-cols-2"
      >
        <h2 className="text-sm font-semibold sm:col-span-2">Create review</h2>
        <div className="space-y-1.5">
          <Label htmlFor="hr-attempt">Attempt ID</Label>
          <Input
            id="hr-attempt"
            required
            value={attemptId}
            onChange={(e) => setAttemptId(e.target.value)}
            placeholder="cuid…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hr-notes">Notes</Label>
          <Input
            id="hr-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {[
          { value: '', label: 'All' },
          ...HR_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
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
      {message ? (
        <Alert>
          <AlertTitle>OK</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <LoadingSpinner label="Loading HR reviews…" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Queue empty" description="No reviews match this filter." />
      ) : (
        <>
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.candidateEmail}</TableCell>
                    <TableCell>
                      <Link
                        href={`/evaluations/${item.attemptId}`}
                        className="text-[var(--hf-primary)] hover:underline"
                      >
                        {item.assessmentTitle}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="min-w-[10rem]"
                        value={noteDrafts[item.id] ?? ''}
                        onChange={(e) =>
                          setNoteDrafts((d) => ({ ...d, [item.id]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[var(--hf-muted)]">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {['APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'IN_REVIEW'].map((s) => (
                          <Button
                            key={s}
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={updatingId === item.id || item.status === s}
                            onClick={() => void updateReview(item.id, s)}
                          >
                            {s.replace(/_/g, ' ')}
                          </Button>
                        ))}
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

export default function HrReviewsPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <HrReviewsContent />
    </RequireAdmin>
  );
}
