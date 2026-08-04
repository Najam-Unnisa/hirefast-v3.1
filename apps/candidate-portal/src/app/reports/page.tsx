import type { Metadata } from 'next';
import { RestrictedForGuests } from '@/components/guards/restricted-for-guests';

export const metadata: Metadata = {
  title: 'Reports',
};

export default function ReportsPage(): React.ReactElement {
  return <RestrictedForGuests areaLabel="Reports" />;
}
