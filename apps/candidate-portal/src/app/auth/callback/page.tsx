import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoadingSpinner } from '@hirefast/shared-ui';
import { AuthCallbackClient } from '@/features/guest/components/auth-callback-client';

export const metadata: Metadata = {
  title: 'Signing in',
};

export default function AuthCallbackPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoadingSpinner label="Finishing Google sign-in…" />
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
