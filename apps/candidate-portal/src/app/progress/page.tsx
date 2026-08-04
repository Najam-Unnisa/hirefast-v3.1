import type { Metadata } from 'next';
import { RequireRegistered } from '@/components/guards/require-registered';
import { ProgressTrackingPanel } from '@/features/registered/components/progress-tracking-panel';

export const metadata: Metadata = {
  title: 'Progress',
};

export default function ProgressPage(): React.ReactElement {
  return (
    <RequireRegistered>
      <ProgressTrackingPanel />
    </RequireRegistered>
  );
}
