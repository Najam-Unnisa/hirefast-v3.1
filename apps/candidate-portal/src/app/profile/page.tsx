import type { Metadata } from 'next';
import { RestrictedForGuests } from '@/components/guards/restricted-for-guests';

export const metadata: Metadata = {
  title: 'Profile',
};

export default function ProfilePage(): React.ReactElement {
  return <RestrictedForGuests areaLabel="Profile" />;
}
