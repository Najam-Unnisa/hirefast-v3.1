'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
  LoadingSpinner,
} from '@hirefast/shared-ui';
import { APP_NAME, IS_PRODUCTION } from '@/constants/app';
import { useSession } from '@/providers/session-provider';
import { ApiClientError } from '@/services/api-client';

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const { beginDevAdminSignIn, status, isAdmin } = useSession();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      router.replace('/dashboard');
    }
  }, [status, isAdmin, router]);

  if (status === 'loading' || (status === 'authenticated' && isAdmin)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Loading…" />
      </div>
    );
  }

  async function handleDevLogin(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await beginDevAdminSignIn(email.trim() || undefined);
      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not create a development admin session.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center gap-6 px-4 py-16">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[var(--hf-primary)]">
          <Shield className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-medium">Admin access</span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{APP_NAME} Admin</h1>
        <p className="text-sm text-[var(--hf-muted)]">
          Sign in with an administrator account to manage the platform.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Sign-in failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {IS_PRODUCTION ? (
        <Alert>
          <AlertTitle>Production sign-in</AlertTitle>
          <AlertDescription>
            Use Google OAuth configured for administrator accounts. Development login is disabled in
            production.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4 rounded-xl border border-[var(--hf-border)] bg-[var(--hf-card)] p-5">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Admin email (optional)</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@hirefast.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <p className="text-xs text-[var(--hf-muted)]">
              Leave blank to use the seeded admin account.
            </p>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={() => void handleDevLogin()}
          >
            {busy ? 'Signing in…' : 'Dev admin login'}
          </Button>
          <p className="text-xs text-[var(--hf-muted)]">
            Non-production only. In production, administrators sign in via Google.
          </p>
        </div>
      )}
    </section>
  );
}
