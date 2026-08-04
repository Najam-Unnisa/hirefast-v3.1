'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';
import { fetchDashboard, type DashboardData } from '@/services/registered.service';

export function RegisteredDashboard(): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const dashboard = await fetchDashboard();
        if (!cancelled) {
          setData(dashboard);
          setLoading(false);
          trackClientEvent(
            dashboard.subscription.isPremium ? 'premium.dashboard_viewed' : 'dashboard.viewed',
          );
          if (dashboard.recommendations.length) {
            trackClientEvent('learning_recommendations.viewed', {
              count: dashboard.recommendations.length,
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to load dashboard.');
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
        <LoadingSpinner label="Loading your dashboard…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>Dashboard unavailable</AlertTitle>
          <AlertDescription>{error ?? 'Something went wrong.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isPremium = Boolean(data.subscription.isPremium ?? data.subscription.canAccessPremium);
  const levelProgress =
    data.gamification.nextLevel != null
      ? Math.min(
          100,
          Math.round(
            ((data.gamification.totalXp - data.gamification.level.minXp) /
              Math.max(1, data.gamification.nextLevel.minXp - data.gamification.level.minXp)) *
              100,
          ),
        )
      : 100;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <p className="text-sm font-medium tracking-wide text-teal-700 uppercase">
          {isPremium ? 'Premium dashboard' : 'Dashboard'}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back
          {data.profile.displayName ? `, ${data.profile.displayName.split(' ')[0]}` : ''}
        </h1>
        <p className="max-w-2xl text-[var(--hf-muted)]">
          {isPremium
            ? 'Your employability status, advanced insights, and personalized next steps — all in one place.'
            : 'Track your employability progress, review insights, and keep building momentum on the free plan.'}
        </p>
      </motion.header>

      {isPremium && data.premiumHighlights?.length ? (
        <section className="space-y-3 border-y border-[var(--hf-border)] py-5">
          <h2 className="font-display text-lg font-semibold">Premium highlights</h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {data.premiumHighlights.map((item) => (
              <li key={item} className="text-sm text-[var(--hf-muted)]">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4 border-y border-[var(--hf-border)] py-6"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--hf-muted)]">Job Readiness Score</p>
              <p className="font-display text-5xl font-semibold text-teal-800">
                {data.jrs ? Math.round(data.jrs.overallScore) : '—'}
              </p>
              <p className="text-sm text-[var(--hf-muted)]">
                {data.jrs?.band ?? 'Complete an assessment to unlock JRS'}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link
                href={data.jrs ? (isPremium ? '/progress' : '/history') : '/assessments'}
                onClick={() => trackClientEvent('jrs.viewed')}
              >
                {data.jrs ? (isPremium ? 'View trends' : 'View history') : 'Start assessment'}
              </Link>
            </Button>
          </div>
          {data.jrs?.skillScores?.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.jrs.skillScores.slice(0, isPremium ? 6 : 4).map((skill) => (
                <li key={skill.skillId} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{skill.skillName}</span>
                    <span>{Math.round(skill.score)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--hf-border)]">
                    <div
                      className="h-full bg-teal-600"
                      style={{ width: `${Math.min(100, skill.score)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {isPremium ? (
            <Button asChild variant="ghost" className="px-0">
              <Link
                href="/analytics"
                onClick={() =>
                  trackClientEvent('premium.feature_engagement', { feature: 'skill_analytics' })
                }
              >
                Open detailed skill analytics
              </Link>
            </Button>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 border-y border-[var(--hf-border)] py-6"
        >
          <p className="text-sm text-[var(--hf-muted)]">Progress</p>
          <p className="font-display text-2xl font-semibold">
            Level {data.gamification.level.levelNumber} · {data.gamification.level.name}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--hf-border)]">
            <div className="h-full bg-orange-500" style={{ width: `${levelProgress}%` }} />
          </div>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-[var(--hf-muted)]">XP</dt>
              <dd className="font-medium">{data.gamification.totalXp}</dd>
            </div>
            <div>
              <dt className="text-[var(--hf-muted)]">Streak</dt>
              <dd className="font-medium">{data.gamification.currentStreak}d</dd>
            </div>
            <div>
              <dt className="text-[var(--hf-muted)]">Badges</dt>
              <dd className="font-medium">{data.gamification.badgesEarned}</dd>
            </div>
          </dl>
          <p className="text-xs text-[var(--hf-muted)]">
            Longest streak: {data.gamification.longestStreak}d
          </p>
        </motion.div>
      </section>

      {isPremium && data.progressTrend && data.progressTrend.length > 1 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Progress trends</h2>
            <Button asChild variant="outline">
              <Link href="/progress">Full progress</Link>
            </Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.progressTrend.slice(-4).map((point) => (
              <li
                key={`${point.assessmentTitle}-${point.calculatedAt}`}
                className="border-t border-[var(--hf-border)] pt-3"
              >
                <p className="font-display text-2xl font-semibold">
                  {Math.round(point.overallScore)}
                </p>
                <p className="text-sm text-[var(--hf-muted)]">{point.assessmentTitle}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Latest assessment</h2>
          {data.latestAttempt ? (
            <div className="space-y-3">
              <p className="font-medium">{data.latestAttempt.assessmentTitle}</p>
              <p className="text-sm text-[var(--hf-muted)]">Status: {data.latestAttempt.status}</p>
              {data.latestAttempt.aiSummary ? (
                <p className="text-sm leading-relaxed text-[var(--hf-muted)]">
                  {data.latestAttempt.aiSummary}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {data.latestAttempt.status === 'IN_PROGRESS' ? (
                  <Button asChild>
                    <Link href={`/assessment/${data.latestAttempt.id}`}>Resume</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link href="/reports">View reports</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--hf-muted)]">
              No assessments yet. Start with {isPremium ? 'a Premium or free' : 'a free'}{' '}
              assessment.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Recommended next steps</h2>
          <ul className="space-y-2">
            {data.nextSteps.map((step) => (
              <li key={step.key}>
                <Link href={step.href} className="text-teal-800 underline-offset-4 hover:underline">
                  {step.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Learning recommendations</h2>
          {data.recommendations.length ? (
            <ul className="space-y-3">
              {data.recommendations.map((item) => (
                <li key={item.id} className="space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[var(--hf-muted)]">{item.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--hf-muted)]">
              Recommendations appear after you complete an assessment.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">
            {isPremium ? 'Recent activity' : 'Badges'}
          </h2>
          {isPremium ? (
            data.recentActivity?.length ? (
              <ul className="space-y-3">
                {data.recentActivity.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hf-border)] pt-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-[var(--hf-muted)]">{item.status}</p>
                    </div>
                    <time className="text-[var(--hf-muted)]">
                      {new Date(item.at).toLocaleDateString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--hf-muted)]">
                Activity appears as you take assessments.
              </p>
            )
          ) : data.badges.length ? (
            <ul className="grid grid-cols-2 gap-3">
              {data.badges.map((badge) => (
                <li key={badge.code} className="space-y-1 border-t border-[var(--hf-border)] pt-3">
                  <p className="font-medium">{badge.name}</p>
                  <p className="text-xs text-[var(--hf-muted)]">{badge.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--hf-muted)]">Earn badges by completing activities.</p>
          )}
        </div>
      </section>

      {isPremium && data.badges.length ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Badges</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.badges.map((badge) => (
              <li key={badge.code} className="space-y-1 border-t border-[var(--hf-border)] pt-3">
                <p className="font-medium">{badge.name}</p>
                <p className="text-xs text-[var(--hf-muted)]">{badge.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.upsell ? (
        <section className="flex flex-col gap-3 border-t border-[var(--hf-border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">{data.upsell.title}</h2>
            <p className="text-sm text-[var(--hf-muted)]">{data.upsell.message}</p>
          </div>
          <Button asChild variant="outline">
            <Link
              href={data.upsell.href}
              onClick={() =>
                trackClientEvent('premium.upgrade_cta_clicked', { source: 'dashboard' })
              }
            >
              {data.upsell.cta}
            </Link>
          </Button>
        </section>
      ) : (
        <section className="flex flex-wrap gap-3 border-t border-[var(--hf-border)] pt-8">
          <Button asChild variant="outline">
            <Link href="/analytics">Skill analytics</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/progress">Progress tracking</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/assessments">Assessment catalog</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/premium">Manage Premium</Link>
          </Button>
        </section>
      )}

      <p className="text-xs text-[var(--hf-muted)]">
        Plan: {data.subscription.planCode} · Assessments completed: {data.assessments.completed} ·
        Available: {data.assessments.available}
        {isPremium && data.assessments.availablePremium != null
          ? ` (${data.assessments.availablePremium} Premium)`
          : ''}
      </p>
    </div>
  );
}
