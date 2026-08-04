'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { getAttemptStatus } from '@/services/assessments.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';
import { useSession } from '@/providers/session-provider';

interface ProcessingPanelProps {
  attemptId: string;
}

export function ProcessingPanel({ attemptId }: ProcessingPanelProps): React.ReactElement {
  const router = useRouter();
  const { isGuest } = useSession();
  const [message, setMessage] = useState('Evaluating your responses…');
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let ticks = 0;

    function nextPath(): string {
      return isGuest
        ? `/results-locked?attemptId=${attemptId}`
        : `/assessment/${attemptId}/results`;
    }

    async function poll(): Promise<void> {
      try {
        const status = await getAttemptStatus(attemptId);
        if (cancelled) return;

        if (status.status === 'COMPLETED' || status.evaluationStatus === 'COMPLETED') {
          trackClientEvent('evaluation.completed', { attemptId });
          router.replace(nextPath());
          return;
        }

        if (status.status === 'FAILED' || status.evaluationStatus === 'FAILED') {
          setError(
            'Evaluation could not finish automatically. Your answers are saved — continue to unlock results after registration, or retry shortly.',
          );
          return;
        }

        ticks += 1;
        if (ticks === 3) setMessage('Running backend scoring…');
        if (ticks === 6) setMessage('Preparing AI evaluation…');
        if (ticks >= 40) {
          setTimedOut(true);
          setMessage('Taking longer than usual — you can continue while we finish.');
          return;
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Network interruption while checking evaluation status.',
          );
        }
      }
    }

    void poll();
    const interval = setInterval(() => {
      void poll();
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [attemptId, router, isGuest]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4"
      >
        <LoadingSpinner label={message} />
        <p className="text-sm text-[var(--hf-muted)]">
          You do not need to wait on this screen. We will take you to the next step when ready.
        </p>
      </motion.div>

      {error ? (
        <Alert variant="destructive" className="text-left">
          <AlertTitle>Evaluation issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {(error || timedOut) && (
        <Button
          type="button"
          onClick={() =>
            router.push(
              isGuest
                ? `/results-locked?attemptId=${attemptId}`
                : `/assessment/${attemptId}/results`,
            )
          }
        >
          Continue
        </Button>
      )}
    </section>
  );
}
