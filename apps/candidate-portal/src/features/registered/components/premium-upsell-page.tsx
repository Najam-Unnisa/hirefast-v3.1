'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@hirefast/shared-ui';
import { trackClientEvent } from '@/services/analytics.service';

const PREMIUM_FEATURES = [
  'Premium assessments (Advanced Leadership Communication and more)',
  'Detailed premium AI reports',
  'Guided premium learning modules',
  'Advanced AI coaching features',
];

export function PremiumUpsellPage(): React.ReactElement {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-wide text-orange-700 uppercase">Premium</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Go further with HireFast Premium
          </h1>
          <p className="text-lg text-[var(--hf-muted)]">
            Your free plan already unlocks core assessments, JRS, reports, and gamification. Premium
            adds deeper practice and coaching when you are ready.
          </p>
        </div>

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

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() =>
              trackClientEvent('premium.upgrade_cta_clicked', { source: 'premium_page' })
            }
          >
            Upgrade intent recorded
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
        <p className="text-xs text-[var(--hf-muted)]">
          Billing checkout ships with the Premium subscription feature. This screen captures upgrade
          intent and keeps Premium routes clearly separated from freemium access.
        </p>
      </motion.div>
    </section>
  );
}
