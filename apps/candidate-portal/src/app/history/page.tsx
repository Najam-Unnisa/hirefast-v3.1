import type { Metadata } from 'next';
import { RestrictedForGuests } from '@/components/guards/restricted-for-guests';

export const metadata: Metadata = {
  title: 'Assessment history',
};

export default function HistoryPage(): React.ReactElement {
  return <RestrictedForGuests areaLabel="Assessment history" />;
}
