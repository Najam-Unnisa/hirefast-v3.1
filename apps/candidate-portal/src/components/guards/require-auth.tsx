'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@hirefast/shared-ui';
import { useSession } from '@/providers/session-provider';

/** Requires any authenticated session (guest or registered). */
export function RequireAuth({
  children,
  unauthenticatedRedirect = '/',
}: {
  children: React.ReactNode;
  unauthenticatedRedirect?: string;
}): React.ReactElement {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace(unauthenticatedRedirect);
    }
  }, [status, router, unauthenticatedRedirect]);

  if (status === 'loading' || status === 'anonymous') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading your session…" />
      </div>
    );
  }

  return <>{children}</>;
}
