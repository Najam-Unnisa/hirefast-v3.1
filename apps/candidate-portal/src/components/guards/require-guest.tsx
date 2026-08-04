'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@hirefast/shared-ui';
import { useSession } from '@/providers/session-provider';

interface RequireGuestProps {
  children: React.ReactNode;
  /** Where to send anonymous visitors */
  unauthenticatedRedirect?: string;
  /** Where to send fully registered users */
  registeredRedirect?: string;
}

/**
 * Guards guest-only screens (welcome, assessment, results-locked, register).
 */
export function RequireGuest({
  children,
  unauthenticatedRedirect = '/',
  registeredRedirect = '/welcome',
}: RequireGuestProps): React.ReactElement {
  const router = useRouter();
  const { status, isGuest, user } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'anonymous') {
      router.replace(unauthenticatedRedirect);
      return;
    }
    if (user && !isGuest) {
      router.replace(registeredRedirect);
    }
  }, [status, isGuest, user, router, unauthenticatedRedirect, registeredRedirect]);

  if (status === 'loading' || status === 'anonymous' || (user && !isGuest)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading your session…" />
      </div>
    );
  }

  return <>{children}</>;
}
