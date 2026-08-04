'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { formatDate } from '@/lib/format';
import { listAuditLogs, type AuditLogItem, type PageMeta } from '@/services/admin.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

function AuditLogsContent(): React.ReactElement {
  const [q, setQ] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAuditLogs({
        q: q || undefined,
        action: action || undefined,
        page,
        limit: 25,
      });
      setItems(result.items);
      setMeta(result.meta);
      trackClientEvent('admin.audit_log_viewed', { page });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [q, action, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Audit logs</h1>
        <p className="mt-1 text-sm text-[var(--hf-muted)]">
          Searchable trail of administrative actions.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(searchDraft.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="audit-q" className="text-xs font-medium text-[var(--hf-muted)]">
            Search message
          </label>
          <Input
            id="audit-q"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Contains…"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-action" className="text-xs font-medium text-[var(--hf-muted)]">
            Action
          </label>
          <select
            id="audit-action"
            className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm sm:w-40"
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="SETTINGS_CHANGE">SETTINGS_CHANGE</option>
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
          <LoadingSpinner label="Loading audit logs…" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No audit entries" description="Try a different search." />
      ) : (
        <>
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-[var(--hf-muted)]">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{item.resourceType}</span>
                      {item.resourceId ? (
                        <span className="mt-0.5 block font-mono text-[10px] text-[var(--hf-muted)]">
                          {item.resourceId}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{item.actor?.email ?? '—'}</TableCell>
                    <TableCell className="max-w-md truncate text-sm">
                      {item.message ?? '—'}
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

export default function AuditLogsPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <AuditLogsContent />
    </RequireAdmin>
  );
}
