import type { Metadata } from 'next';
import { RestrictedForGuests } from '@/components/guards/restricted-for-guests';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage(): React.ReactElement {
  return <RestrictedForGuests areaLabel="Dashboard" />;
}
