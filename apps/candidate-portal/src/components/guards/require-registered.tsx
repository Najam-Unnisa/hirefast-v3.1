'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@hirefast/shared-ui';
import { useSession } from '@/providers/session-provider';

/** Requires a registered USER (or admin) — blocks guests and anonymous visitors. */
export function RequireRegistered({
  children,
  guestRedirect = '/welcome',
  unauthenticatedRedirect = '/',
}: {
  children: React.ReactNode;
  guestRedirect?: string;
  unauthenticatedRedirect?: string;
}): React.ReactElement {
  const router = useRouter();
  const { status, isGuest, user } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'anonymous') {
      router.replace(unauthenticatedRedirect);
      return;
    }
    if (isGuest) {
      router.replace(guestRedirect);
    }
  }, [status, isGuest, router, guestRedirect, unauthenticatedRedirect]);

  if (status === 'loading' || status === 'anonymous' || isGuest || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading your workspace…" />
      </div>
    );
  }

  return <>{children}</>;
}
