import type { Metadata } from 'next';
import { RequireRegistered } from '@/components/guards/require-registered';
import { RegisteredDashboard } from '@/features/registered/components/registered-dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage(): React.ReactElement {
  return (
    <RequireRegistered>
      <RegisteredDashboard />
    </RequireRegistered>
  );
}
