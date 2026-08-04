'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
  LoadingSpinner,
} from '@hirefast/shared-ui';
import { RequireAdmin } from '@/components/guards/require-admin';
import { formatDate, formatNumber, statusBadgeVariant } from '@/lib/format';
import { fetchOverview, type AdminOverview } from '@/services/admin.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

function DashboardContent(): React.ReactElement {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const overview = await fetchOverview();
        if (!cancelled) {
          setData(overview);
          trackClientEvent('admin.dashboard_viewed');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load overview.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading dashboard…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load dashboard</AlertTitle>
        <AlertDescription>{error ?? 'Unknown error'}</AlertDescription>
      </Alert>
    );
  }

  const kpis = [
    { label: 'Candidates', value: data.totalCandidates },
    { label: 'Guests', value: data.guestUsers },
    { label: 'Registered', value: data.registeredUsers },
    { label: 'Premium', value: data.premiumUsers },
    { label: 'Active assessments', value: data.activeAssessments },
    { label: 'Pending evals', value: data.pendingEvaluations },
    { label: 'Completed evals', value: data.completedEvaluations },
    { label: 'Failed evals', value: data.failedEvaluations },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--hf-muted)]">
            Platform health and recent administrative activity.
          </p>
        </div>
        <Badge variant={statusBadgeVariant(data.platformHealth.status)}>
          Health: {data.platformHealth.status}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--hf-muted)]">
              {kpi.label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
              {formatNumber(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--hf-muted)]">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.quickActions.map((action) => (
              <Button key={action.key} asChild variant="outline" size="sm">
                <Link href={action.href}>{action.title}</Link>
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--hf-muted)]">
            Recent actions
          </h2>
          {data.recentAdministrativeActions.length === 0 ? (
            <EmptyState title="No recent actions" description="Audit activity will appear here." />
          ) : (
            <ul className="divide-y divide-[var(--hf-border)] rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)]">
              {data.recentAdministrativeActions.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.action}</Badge>
                    <span className="text-xs text-[var(--hf-muted)]">{item.resourceType}</span>
                  </div>
                  <p className="mt-1 text-sm">{item.message ?? '—'}</p>
                  <p className="mt-1 text-xs text-[var(--hf-muted)]">
                    {item.actorEmail ?? 'system'} · {formatDate(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage(): React.ReactElement {
  return (
    <RequireAdmin>
      <DashboardContent />
    </RequireAdmin>
  );
}
