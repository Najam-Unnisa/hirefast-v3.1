import type { Metadata } from 'next';
import { RestrictedForGuests } from '@/components/guards/restricted-for-guests';

export const metadata: Metadata = {
  title: 'Premium',
};

export default function PremiumPage(): React.ReactElement {
  return <RestrictedForGuests areaLabel="Premium features" />;
}
