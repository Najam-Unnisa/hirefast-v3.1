'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { useSession } from '@/providers/session-provider';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

function AuthCallbackInner(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authError = searchParams.get('error');
    const message = searchParams.get('message');
    if (authError) {
      setError(message || 'Authentication failed. Please try again.');
      return;
    }

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const expiresIn = searchParams.get('expiresIn') ?? undefined;

    if (!accessToken || !refreshToken) {
      setError('Missing authentication tokens. Please sign in again.');
      return;
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
          setError('This portal is restricted to administrators.');
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
  }, [searchParams, establishSession, router]);

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
