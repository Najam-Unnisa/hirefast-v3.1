'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle, Button, Input, Label } from '@hirefast/shared-ui';
import { useSession } from '@/providers/session-provider';
import { completeGuestProfile } from '@/services/users.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

export function RegistrationHandoffForm(): React.ReactElement {
  const router = useRouter();
  const { user, refreshUser, isGuest } = useSession();
  const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(user?.name?.split(' ').slice(1).join(' ') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(!isGuest && Boolean(user));

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      trackClientEvent('registration.cta_clicked', { source: 'registration_form' });
      await completeGuestProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
      await refreshUser();
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not complete registration. Please try again.',
      );
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h1 className="font-display text-3xl font-semibold">You are registered</h1>
          <p className="text-[var(--hf-muted)]">
            Your guest account is now a HireFast member. The full Registered User experience ships
            next — for now you can return home.
          </p>
          <Button type="button" onClick={() => router.push('/')}>
            Back to home
          </Button>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <motion.form
        onSubmit={(event) => void handleSubmit(event)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Complete your profile
          </h1>
          <p className="text-[var(--hf-muted)]">
            Unlock your assessment results by finishing registration. This upgrades your existing
            guest account.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            maxLength={100}
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
            maxLength={100}
            autoComplete="family-name"
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Registration issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" disabled={busy || !firstName.trim() || !lastName.trim()}>
          {busy ? 'Saving…' : 'Unlock my results'}
        </Button>
      </motion.form>
    </section>
  );
}
