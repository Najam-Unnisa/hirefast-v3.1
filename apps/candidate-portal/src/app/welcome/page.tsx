import type { Metadata } from 'next';
import { RequireGuest } from '@/components/guards/require-guest';
import { WelcomePanel } from '@/features/guest/components/welcome-panel';

export const metadata: Metadata = {
  title: 'Welcome',
};

export default function WelcomePage(): React.ReactElement {
  return (
    <RequireGuest registeredRedirect="/dashboard">
      <WelcomePanel />
    </RequireGuest>
  );
}
