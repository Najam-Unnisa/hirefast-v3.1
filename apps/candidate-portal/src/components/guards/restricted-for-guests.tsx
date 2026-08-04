'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner, Alert, AlertDescription, AlertTitle } from '@hirefast/shared-ui';
import { useSession } from '@/providers/session-provider';

/**
 * Blocks guests (and anonymous users) from dashboard / reports / profile / premium.
 */
export function RestrictedForGuests({ areaLabel }: { areaLabel: string }): React.ReactElement {
  const router = useRouter();
  const { status, isGuest } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'anonymous') {
      router.replace('/');
      return;
    }
    if (isGuest) {
      router.replace('/welcome');
    } else {
      router.replace('/welcome');
    }
  }, [status, isGuest, router]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16">
      <LoadingSpinner label="Redirecting…" />
      <Alert>
        <AlertTitle>{areaLabel} is unavailable</AlertTitle>
        <AlertDescription>
          Guest accounts cannot access this area. Finish your assessment and registration to unlock
          the full HireFast experience.
        </AlertDescription>
      </Alert>
    </div>
  );
}
