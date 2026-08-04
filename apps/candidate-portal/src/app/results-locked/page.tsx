import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoadingSpinner } from '@hirefast/shared-ui';
import { RequireGuest } from '@/components/guards/require-guest';
import { ResultsLockedPanel } from '@/features/guest/components/results-locked-panel';

export const metadata: Metadata = {
  title: 'Results locked',
};

export default function ResultsLockedPage(): React.ReactElement {
  return (
    <RequireGuest>
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <LoadingSpinner label="Loading…" />
          </div>
        }
      >
        <ResultsLockedPanel />
      </Suspense>
    </RequireGuest>
  );
}
