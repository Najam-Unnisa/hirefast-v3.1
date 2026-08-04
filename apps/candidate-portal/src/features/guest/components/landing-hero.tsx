'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Input, Label } from '@hirefast/shared-ui';
import { APP_NAME, IS_PRODUCTION } from '@/constants/app';
import { useSession } from '@/providers/session-provider';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

export function LandingHero(): React.ReactElement {
  const { status, isGuest, beginGoogleSignIn, beginDevGuestSignIn } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState('guest@hirefast.local');

  useEffect(() => {
    trackClientEvent('landing.page_viewed');
  }, []);

  async function handleStart(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      if (status === 'authenticated' && isGuest) {
        window.location.assign('/welcome');
        return;
      }
      await beginGoogleSignIn();
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Google sign-in is unavailable right now. Please try again.',
      );
    }
  }

  async function handleDevGuest(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await beginDevGuestSignIn(devEmail);
      window.location.assign('/welcome');
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiClientError ? err.message : 'Could not create a guest session.');
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=2400&q=80"
          alt="Professional preparing for a workplace conversation"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1f1c]/92 via-[#0b1f1c]/75 to-[#0b1f1c]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f1c]/80 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-2xl space-y-6 text-white"
        >
          <p className="font-display text-sm font-medium tracking-[0.2em] text-teal-200 uppercase">
            {APP_NAME}
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Prove your communication skills in minutes.
          </h1>
          <p className="max-w-xl text-lg text-white/80">
            Take the free General Communication Assessment — no profile required until you want your
            results.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              onClick={() => void handleStart()}
              disabled={busy || status === 'loading'}
              className="bg-teal-500 text-white hover:bg-teal-400"
            >
              {busy ? 'Starting…' : 'Start Free Assessment'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="text-sm text-white/70"
            >
              Continues with Google · ~10 minutes
            </motion.p>
          </div>

          {error ? (
            <Alert
              variant="destructive"
              className="max-w-xl border-red-400/40 bg-red-950/50 text-white"
            >
              <AlertTitle>Sign-in issue</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {!IS_PRODUCTION ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="max-w-md space-y-3 rounded-lg border border-white/15 bg-white/5 p-4 backdrop-blur"
            >
              <p className="text-xs tracking-wide text-white/60 uppercase">Development only</p>
              <div className="space-y-2">
                <Label htmlFor="dev-guest-email" className="text-white/80">
                  Dev guest email
                </Label>
                <Input
                  id="dev-guest-email"
                  value={devEmail}
                  onChange={(event) => setDevEmail(event.target.value)}
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleDevGuest()}
                disabled={busy}
                className="border-white/30 text-white hover:bg-white/10"
              >
                Continue as Dev Guest
              </Button>
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
