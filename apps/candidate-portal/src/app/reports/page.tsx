import type { Metadata } from 'next';
import { RequireRegistered } from '@/components/guards/require-registered';
import { ReportsList } from '@/features/registered/components/reports-list';

export const metadata: Metadata = {
  title: 'Reports',
};

export default function ReportsPage(): React.ReactElement {
  return (
    <RequireRegistered>
      <ReportsList />
    </RequireRegistered>
  );
}
