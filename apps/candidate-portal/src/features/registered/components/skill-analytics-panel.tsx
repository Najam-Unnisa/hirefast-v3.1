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
import { fetchSkillAnalytics } from '@/services/registered.service';

export function SkillAnalyticsPanel(): React.ReactElement {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchSkillAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const analytics = await fetchSkillAnalytics();
        if (!cancelled) {
          setData(analytics);
          setLoading(false);
          trackClientEvent('skill_analytics.viewed');
          trackClientEvent('premium.feature_engagement', { feature: 'skill_analytics' });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Skill analytics require an active Premium subscription.',
          );
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading skill analytics…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>Analytics unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/premium">Manage Premium</Link>
        </Button>
      </div>
    );
  }

  if (!data?.skills.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          title="No skill analytics yet"
          description="Complete assessments to generate detailed skill trends."
          action={
            <Button asChild>
              <Link href="/assessments">Take an assessment</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-orange-700 uppercase">Premium</p>
        <h1 className="font-display text-3xl font-semibold">Detailed skill analytics</h1>
        <p className="text-[var(--hf-muted)]">
          Compare skill performance, spot weak areas, and track improvement over time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Ready" value={data.distribution.ready} />
        <Stat label="Developing" value={data.distribution.developing} />
        <Stat label="Foundational" value={data.distribution.foundational} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Priority skills</h2>
          <ul className="space-y-2">
            {data.weakest.map((skill) => (
              <li
                key={skill.skillName}
                className="flex justify-between border-t border-[var(--hf-border)] pt-2 text-sm"
              >
                <span>{skill.skillName}</span>
                <span>{Math.round(skill.latestScore)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Strongest skills</h2>
          <ul className="space-y-2">
            {data.strongest.map((skill) => (
              <li
                key={skill.skillName}
                className="flex justify-between border-t border-[var(--hf-border)] pt-2 text-sm"
              >
                <span>{skill.skillName}</span>
                <span>{Math.round(skill.latestScore)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Skill trends</h2>
        <ul className="space-y-5">
          {data.skills.map((skill) => (
            <li key={skill.skillId} className="space-y-2 border-t border-[var(--hf-border)] pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{skill.skillName}</p>
                <p className="text-sm text-[var(--hf-muted)]">
                  {Math.round(skill.latestScore)} · Δ {skill.delta >= 0 ? '+' : ''}
                  {skill.delta} · avg {Math.round(skill.averageScore)}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--hf-border)]">
                <div
                  className="h-full bg-teal-600"
                  style={{ width: `${Math.min(100, skill.latestScore)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-t border-[var(--hf-border)] pt-3">
      <p className="text-sm text-[var(--hf-muted)]">{label}</p>
      <p className="font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
