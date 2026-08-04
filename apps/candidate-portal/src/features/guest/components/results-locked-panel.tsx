'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { Button } from '@hirefast/shared-ui';
import { trackClientEvent } from '@/services/analytics.service';

export function ResultsLockedPanel(): React.ReactElement {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');

  useEffect(() => {
    trackClientEvent('results.locked_viewed', attemptId ? { attemptId } : undefined);
  }, [attemptId]);

  return (
    <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-8 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-800">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-wide text-teal-700 uppercase">
            Assessment complete
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Congratulations — you finished the assessment.
          </h1>
          <p className="text-lg text-[var(--hf-muted)]">
            Your Job Readiness Score, AI report, and skill insights are ready behind registration.
            Complete your profile to unlock them — no need to retake the assessment.
          </p>
        </div>

        <ul className="mx-auto max-w-md space-y-2 text-left text-sm text-[var(--hf-muted)]">
          <li>• Detailed communication strengths and gaps</li>
          <li>• Personalized recommendations</li>
          <li>• Progress tracking on your dashboard</li>
        </ul>

        <div className="flex flex-col items-center gap-3">
          <Button asChild size="lg">
            <Link href="/register" onClick={() => trackClientEvent('registration.cta_clicked')}>
              Complete registration
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <p className="text-xs text-[var(--hf-muted)]">
            Converts your guest account — we will not create a duplicate.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
