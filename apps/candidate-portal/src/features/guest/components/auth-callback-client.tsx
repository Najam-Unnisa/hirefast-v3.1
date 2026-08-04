'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@hirefast/shared-ui';
import { useSession } from '@/providers/session-provider';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

export function AuthCallbackClient(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authError = searchParams.get('error');
    const message = searchParams.get('message');
    if (authError) {
      setError(message || 'Google authentication failed. Please try again.');
      return;
    }

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const expiresIn = searchParams.get('expiresIn') ?? undefined;

    if (!accessToken || !refreshToken) {
      setError('Missing authentication tokens. Please start again from the landing page.');
      return;
    }

    let cancelled = false;
    async function complete(): Promise<void> {
      try {
        await establishSession({
          accessToken: accessToken!,
          refreshToken: refreshToken!,
          expiresIn,
        });
        trackClientEvent('auth.google_sign_in_completed');
        if (!cancelled) {
          router.replace('/welcome');
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
