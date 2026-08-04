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
import { listUsers, type AdminUserListItem, type PageMeta } from '@/services/admin.service';
import { ApiClientError } from '@/services/api-client';

function CandidatesContent(): React.ReactElement {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers({
        q: q || undefined,
        status: status || undefined,
        role: role || undefined,
        page,
        limit: 20,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  }, [q, status, role, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function applySearch(e: React.FormEvent): void {
    e.preventDefault();
    setPage(1);
    setQ(searchDraft.trim());
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Candidates</h1>
        <p className="mt-1 text-sm text-[var(--hf-muted)]">
          Search and manage candidate accounts, roles, and status.
        </p>
      </div>

      <form
        onSubmit={applySearch}
        className="flex flex-col gap-3 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="candidate-q" className="text-xs font-medium text-[var(--hf-muted)]">
            Search
          </label>
          <Input
            id="candidate-q"
            placeholder="Email or name…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="candidate-status" className="text-xs font-medium text-[var(--hf-muted)]">
            Status
          </label>
          <select
            id="candidate-status"
            className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm sm:w-40"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_REGISTRATION">Pending</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="candidate-role" className="text-xs font-medium text-[var(--hf-muted)]">
            Role
          </label>
          <select
            id="candidate-role"
            className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm sm:w-36"
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="USER">User</option>
            <option value="GUEST">Guest</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <Button type="submit" size="sm" className="h-10">
          Search
        </Button>
      </form>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <LoadingSpinner label="Loading candidates…" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No candidates found" description="Try adjusting your filters." />
      ) : (
        <>
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        href={`/candidates/${user.id}`}
                        className="font-medium text-[var(--hf-primary)] hover:underline"
                      >
                        {user.email}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[var(--hf-muted)]">
                      {user.profile?.displayName ||
                        [user.profile?.firstName, user.profile?.lastName]
                          .filter(Boolean)
                          .join(' ') ||
                        '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(user.status)}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>{user.planCode ?? '—'}</TableCell>
                    <TableCell>{user.attemptCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-[var(--hf-muted)]">
                      {formatDate(user.createdAt)}
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

export default function CandidatesPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <CandidatesContent />
    </RequireAdmin>
  );
}
