'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { IS_PRODUCTION } from '@/constants/app';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';
import {
  activatePremium,
  downgradeSubscription,
  expirePremiumForTesting,
  fetchSubscription,
} from '@/services/registered.service';

const PREMIUM_FEATURES = [
  'Premium assessments including Advanced Leadership Communication',
  'Detailed skill analytics and historical trends',
  'Priority learning recommendations after every evaluation',
  'Progress tracking across all completed assessments',
  'Premium gamification rewards',
];

export function PremiumExperiencePage(): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{
    isPremium: boolean;
    planCode: string | null;
    status: string;
    isExpired?: boolean;
    message?: string;
    currentPeriodEnd?: string;
  } | null>(null);

  async function refresh(): Promise<void> {
    const data = await fetchSubscription();
    setSubscription(data);
  }

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const data = await fetchSubscription();
        if (!cancelled) {
          setSubscription(data);
          setLoading(false);
          trackClientEvent(
            data.isPremium ? 'premium.feature_engagement' : 'premium.upgrade_cta_clicked',
            { source: 'premium_page_view' },
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to load subscription.');
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleActivate(): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      trackClientEvent('premium.upgrade_cta_clicked', { source: 'activate_button' });
      await activatePremium();
      await refresh();
      trackClientEvent('premium.activated', { source: 'premium_page' });
      setMessage('Premium is active. Your catalog and analytics are unlocked.');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not activate Premium.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDowngrade(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await downgradeSubscription();
      await refresh();
      trackClientEvent('premium.downgraded', { source: 'premium_page' });
      setMessage('Returned to Free plan. Premium assessments are locked again.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not downgrade.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExpire(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await expirePremiumForTesting();
      await refresh();
      setMessage('Premium expired for testing and freemium access was restored.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not expire Premium.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading Premium status…" />
      </div>
    );
  }

  const isPremium = Boolean(subscription?.isPremium);

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-wide text-orange-700 uppercase">
            {isPremium ? 'Premium active' : 'Premium'}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {isPremium ? 'Your Premium HireFast workspace' : 'Go further with HireFast Premium'}
          </h1>
          <p className="text-lg text-[var(--hf-muted)]">
            {isPremium
              ? 'You have the full Premium toolkit — advanced assessments, deeper analytics, and priority learning paths.'
              : 'Unlock advanced assessments, detailed skill analytics, progress trends, and priority recommendations.'}
          </p>
          <p className="text-sm text-[var(--hf-muted)]">
            Plan: {subscription?.planCode ?? 'NONE'} · Status: {subscription?.status}
            {subscription?.currentPeriodEnd
              ? ` · Renews/ends ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
              : ''}
          </p>
        </div>

        {subscription?.isExpired ? (
          <Alert variant="warning">
            <AlertTitle>Premium expired</AlertTitle>
            <AlertDescription>
              {subscription.message ??
                'Your Premium subscription is no longer active. Freemium features remain available.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <ul className="space-y-3">
          {PREMIUM_FEATURES.map((feature) => (
            <li
              key={feature}
              className="border-t border-[var(--hf-border)] pt-3 text-[var(--hf-muted)]"
            >
              {feature}
            </li>
          ))}
        </ul>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Subscription issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <Alert variant="success">
            <AlertTitle>Updated</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {isPremium ? (
            <>
              <Button asChild>
                <Link href="/assessments">Open Premium assessments</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/analytics">Skill analytics</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/progress">Progress</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void handleDowngrade()}
              >
                Downgrade to Free
              </Button>
            </>
          ) : (
            <>
              <Button type="button" disabled={busy} onClick={() => void handleActivate()}>
                {busy ? 'Activating…' : 'Activate Premium'}
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </>
          )}
        </div>

        {!IS_PRODUCTION && isPremium ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void handleExpire()}
          >
            Dev: expire Premium
          </Button>
        ) : null}

        <p className="text-xs text-[var(--hf-muted)]">
          External billing checkout can replace activation later. Subscription status remains the
          source of truth for Premium access.
        </p>
      </motion.div>
    </section>
  );
}
