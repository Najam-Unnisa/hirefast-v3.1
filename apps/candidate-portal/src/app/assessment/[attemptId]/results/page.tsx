import type { Metadata } from 'next';
import { RequireRegistered } from '@/components/guards/require-registered';
import { AttemptResults } from '@/features/registered/components/attempt-results';

export const metadata: Metadata = {
  title: 'Results',
};

export default function AttemptResultsPage(): React.ReactElement {
  return (
    <RequireRegistered>
      <AttemptResults />
    </RequireRegistered>
  );
}
