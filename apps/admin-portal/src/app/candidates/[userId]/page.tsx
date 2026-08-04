'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
  LoadingSpinner,
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
  getUser,
  listUserAttempts,
  listUserReports,
  patchUser,
  type AdminUserDetail,
  type UserAttemptItem,
  type UserReportItem,
} from '@/services/admin.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

function CandidateDetailContent(): React.ReactElement {
  const params = useParams();
  const userId = String(params.userId);

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [attempts, setAttempts] = useState<UserAttemptItem[]>([]);
  const [reports, setReports] = useState<UserReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [roleDraft, setRoleDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, attemptPage, reportPage] = await Promise.all([
        getUser(userId),
        listUserAttempts(userId, { limit: 20 }),
        listUserReports(userId, { limit: 20 }),
      ]);
      setUser(detail);
      setStatusDraft(detail.status);
      setRoleDraft(detail.role.name);
      setAttempts(attemptPage.items);
      setReports(reportPage.items);
      trackClientEvent('admin.candidate_viewed', { userId });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load candidate.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveControls(): Promise<void> {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const body: { status?: string; role?: string } = {};
      if (statusDraft !== user.status) body.status = statusDraft;
      if (roleDraft !== user.role.name) body.role = roleDraft;
      if (!body.status && !body.role) {
        setMessage('No changes to save.');
        return;
      }
      await patchUser(userId, body);
      setMessage('User updated.');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading candidate…" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!user) return <EmptyState title="Candidate not found" />;

  const profile = user.profile as {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    headline?: string | null;
  } | null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/candidates" className="text-sm text-[var(--hf-muted)] hover:underline">
            ← Candidates
          </Link>
          <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">{user.email}</h1>
          <p className="mt-1 text-sm text-[var(--hf-muted)]">
            {profile?.displayName ||
              [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
              'No display name'}
            {profile?.headline ? ` · ${profile.headline}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusBadgeVariant(user.status)}>{user.status}</Badge>
          <Badge variant="outline">{user.role.name}</Badge>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold">Profile</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--hf-muted)]">Created</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--hf-muted)]">Last login</dt>
              <dd>{formatDate(user.lastLoginAt)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--hf-muted)]">Email verified</dt>
              <dd>{user.emailVerified ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--hf-muted)]">Attempts</dt>
              <dd>{user._count.attempts}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--hf-muted)]">Reports</dt>
              <dd>{user._count.aiReports}</dd>
            </div>
          </dl>

          {user.latestJrs ? (
            <div className="border-t border-[var(--hf-border)] pt-3">
              <h3 className="text-xs font-semibold uppercase text-[var(--hf-muted)]">
                Job readiness
              </h3>
              <p className="mt-1 font-display text-2xl font-semibold">
                {formatNumber(user.latestJrs.overallScore)}
              </p>
              <p className="text-sm text-[var(--hf-muted)]">
                Band: {user.latestJrs.band ?? '—'} · {formatDate(user.latestJrs.calculatedAt)}
              </p>
            </div>
          ) : null}

          <div className="space-y-3 border-t border-[var(--hf-border)] pt-3">
            <h3 className="text-sm font-semibold">Controls</h3>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--hf-muted)]" htmlFor="user-status">
                Status
              </label>
              <select
                id="user-status"
                className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING_REGISTRATION">PENDING_REGISTRATION</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--hf-muted)]" htmlFor="user-role">
                Role
              </label>
              <select
                id="user-role"
                className="flex h-10 w-full rounded-md border border-[var(--hf-border)] bg-[var(--hf-card)] px-3 text-sm"
                value={roleDraft}
                onChange={(e) => setRoleDraft(e.target.value)}
              >
                <option value="GUEST">GUEST</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <Button type="button" size="sm" disabled={saving} onClick={() => void saveControls()}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--hf-muted)]">
              Attempts
            </h2>
            {attempts.length === 0 ? (
              <EmptyState
                title="No attempts"
                description="This candidate has not started assessments."
              />
            ) : (
              <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>JRS</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <Link
                            href={`/evaluations/${attempt.id}`}
                            className="text-[var(--hf-primary)] hover:underline"
                          >
                            {attempt.assessmentTitle}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(attempt.status)}>
                            {attempt.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {attempt.score != null ? formatNumber(attempt.score) : '—'}
                        </TableCell>
                        <TableCell>
                          {attempt.jrs
                            ? `${formatNumber(attempt.jrs.overallScore)} (${attempt.jrs.band ?? '—'})`
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-[var(--hf-muted)]">
                          {formatDate(attempt.startedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--hf-muted)]">
              Reports
            </h2>
            {reports.length === 0 ? (
              <EmptyState
                title="No reports"
                description="AI reports will appear after evaluations."
              />
            ) : (
              <div className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.title}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(report.status)}>{report.status}</Badge>
                        </TableCell>
                        <TableCell>{report.assessmentTitle ?? '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-[var(--hf-muted)]">
                          {formatDate(report.generatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function CandidateDetailPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <CandidateDetailContent />
    </RequireAdmin>
  );
}
