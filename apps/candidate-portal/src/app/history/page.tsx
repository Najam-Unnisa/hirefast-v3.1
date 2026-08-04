import type { Metadata } from 'next';
import { RequireRegistered } from '@/components/guards/require-registered';
import { AssessmentHistory } from '@/features/registered/components/assessment-history';

export const metadata: Metadata = {
  title: 'Assessment history',
};

export default function HistoryPage(): React.ReactElement {
  return (
    <RequireRegistered>
      <AssessmentHistory />
    </RequireRegistered>
  );
}
