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
  createAssessment,
  duplicateAssessment,
  listAssessments,
  listCategories,
  patchAssessmentStatus,
  type AdminAssessment,
  type AdminCategory,
  type PageMeta,
} from '@/services/admin.service';
import { ApiClientError } from '@/services/api-client';

function AssessmentsContent(): React.ReactElement {
  const [items, setItems] = useState<AdminAssessment[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    categoryId: '',
    code: '',
    slug: '',
    title: '',
    accessTier: 'FREE',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, cats] = await Promise.all([
        listAssessments({
          q: q || undefined,
          status: status || undefined,
          page,
          limit: 20,
        }),
        listCategories(),
      ]);
      setItems(result.items);
      setMeta(result.meta);
      setCategories(cats);
      setForm((prev) => (prev.categoryId || !cats[0] ? prev : { ...prev, categoryId: cats[0].id }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load assessments.');
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await createAssessment({
        categoryId: form.categoryId,
        code: form.code,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: form.title,
        accessTier: form.accessTier,
      });
      setShowCreate(false);
      setForm({
        categoryId: categories[0]?.id ?? '',
        code: '',
        slug: '',
        title: '',
        accessTier: 'FREE',
      });
      window.location.href = `/assessments/${created.id}`;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed.');
    } finally {
      setCreating(false);
    }
  }

  async function handleStatus(id: string, next: string): Promise<void> {
    try {
      await patchAssessmentStatus(id, next);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Status update failed.');
    }
  }

  async function handleDuplicate(id: string): Promise<void> {
    try {
      const copy = await duplicateAssessment(id);
      window.location.href = `/assessments/${copy.id}`;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Duplicate failed.');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Assessments</h1>
          <p className="mt-1 text-sm text-[var(--hf-muted)]">
            Create, publish, archive, and duplicate assessment content.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : 'Create assessment'}
        </Button>
      </div>

      {showCreate ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="grid gap-3 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="a-title">Title</Label>
            <Input
              id="a-title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-code">Code</Label>
            <Input
              id="a-code"
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-slug">Slug</Label>
            <Input
              id="a-slug"
              placeholder="auto from title"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-category">Category</Label>
            <select
              id="a-category"
              required
              className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-tier">Access tier</Label>
            <select
              id="a-tier"
              className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm"
              value={form.accessTier}
              onChange={(e) => setForm((f) => ({ ...f, accessTier: e.target.value }))}
            >
              <option value="FREE">FREE</option>
              <option value="PREMIUM">PREMIUM</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(searchDraft.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="as-q">Search</Label>
          <Input
            id="as-q"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Title, code, or slug…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="as-status">Status</Label>
          <select
            id="as-status"
            className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm sm:w-40"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
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
          <LoadingSpinner label="Loading assessments…" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No assessments"
          description="Create your first assessment to get started."
        />
      ) : (
        <>
          <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={`/assessments/${item.id}`}
                        className="font-medium text-[var(--hf-primary)] hover:underline"
                      >
                        {item.title}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>{item.accessTier}</TableCell>
                    <TableCell>{item.questionCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-[var(--hf-muted)]">
                      {formatDate(item.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.status !== 'PUBLISHED' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleStatus(item.id, 'PUBLISHED')}
                          >
                            Publish
                          </Button>
                        ) : null}
                        {item.status !== 'ARCHIVED' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleStatus(item.id, 'ARCHIVED')}
                          >
                            Archive
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDuplicate(item.id)}
                        >
                          Duplicate
                        </Button>
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

export default function AssessmentsPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <AssessmentsContent />
    </RequireAdmin>
  );
}
