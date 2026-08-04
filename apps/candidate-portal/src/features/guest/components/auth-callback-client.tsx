'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { useSession } from '@/providers/session-provider';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

function readOAuthParams(searchParams: URLSearchParams): {
  error: string | null;
  message: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: string | undefined;
} {
  const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
  const hashParams = new URLSearchParams(hash);

  return {
    error: searchParams.get('error') ?? hashParams.get('error'),
    message: searchParams.get('message') ?? hashParams.get('message'),
    // Success tokens are delivered in the URL fragment only (never query string).
    accessToken: hashParams.get('accessToken'),
    refreshToken: hashParams.get('refreshToken'),
    expiresIn: hashParams.get('expiresIn') ?? undefined,
  };
}

export function AuthCallbackClient(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const {
      error: authError,
      message,
      accessToken,
      refreshToken,
      expiresIn,
    } = readOAuthParams(searchParams);

    if (authError) {
      setError(message || 'Google authentication failed. Please try again.');
      return;
    }

    if (!accessToken || !refreshToken) {
      setError('Missing authentication tokens. Please start again from the landing page.');
      return;
    }

    // Drop secrets from the address bar after reading the fragment.
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    let cancelled = false;
    async function complete(): Promise<void> {
      try {
        const user = await establishSession({
          accessToken: accessToken!,
          refreshToken: refreshToken!,
          expiresIn,
        });
        trackClientEvent('auth.google_sign_in_completed');
        if (!cancelled) {
          router.replace(user.role === 'GUEST' ? '/welcome' : '/dashboard');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Could not establish your session after Google sign-in.',
          );
        }
      }
    }
    void complete();
    return () => {
      cancelled = true;
    };
  }, [searchParams, establishSession, router]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Authentication failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button type="button" onClick={() => router.push('/')}>
          Return to landing
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner label="Finishing Google sign-in…" />
    </div>
  );
}
