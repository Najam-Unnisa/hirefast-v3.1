'use client';

import { Suspense, useEffect, useState } from 'react';
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

function AuthCallbackInner(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession, signOut } = useSession();
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
      setError(message || 'Authentication failed. Please try again.');
      return;
    }

    if (!accessToken || !refreshToken) {
      setError('Missing authentication tokens. Please sign in again.');
      return;
    }

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
        if (user.role !== 'ADMIN') {
          await signOut();
          if (!cancelled) {
            setError('This portal is restricted to administrators.');
          }
          return;
        }
        trackClientEvent('admin.login', { method: 'oauth' });
        if (!cancelled) {
          router.replace('/dashboard');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError ? err.message : 'Could not establish your admin session.',
          );
        }
      }
    }
    void complete();
    return () => {
      cancelled = true;
    };
  }, [searchParams, establishSession, signOut, router]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Authentication failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button type="button" onClick={() => router.push('/login')}>
          Return to login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner label="Finishing sign-in…" />
    </div>
  );
}

export default function AuthCallbackPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoadingSpinner label="Finishing sign-in…" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
