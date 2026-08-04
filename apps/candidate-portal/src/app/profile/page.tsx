import type { Metadata } from 'next';
import { RequireRegistered } from '@/components/guards/require-registered';
import { ProfileManager } from '@/features/registered/components/profile-manager';

export const metadata: Metadata = {
  title: 'Profile',
};

export default function ProfilePage(): React.ReactElement {
  return (
    <RequireRegistered>
      <ProfileManager />
    </RequireRegistered>
  );
}
