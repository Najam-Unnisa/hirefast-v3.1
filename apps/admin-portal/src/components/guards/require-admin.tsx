'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@hirefast/shared-ui';
import { useSession } from '@/providers/session-provider';

/** Requires an authenticated ADMIN — redirects guests/users/anonymous away. */
export function RequireAdmin({
  children,
  unauthenticatedRedirect = '/login',
  unauthorizedRedirect = '/login',
}: {
  children: React.ReactNode;
  unauthenticatedRedirect?: string;
  unauthorizedRedirect?: string;
}): React.ReactElement {
  const router = useRouter();
  const { status, isAdmin, user, signOut } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'anonymous') {
      router.replace(unauthenticatedRedirect);
      return;
    }
    if (user && !isAdmin) {
      void signOut().then(() => {
        router.replace(unauthorizedRedirect);
      });
    }
  }, [status, isAdmin, user, router, unauthenticatedRedirect, unauthorizedRedirect, signOut]);

  if (status === 'loading' || status === 'anonymous' || !user || !isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Verifying admin access…" />
      </div>
    );
  }

  return <>{children}</>;
}
