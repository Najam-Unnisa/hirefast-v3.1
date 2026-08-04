import type { Metadata } from 'next';
import { RequireRegistered } from '@/components/guards/require-registered';
import { PremiumUpsellPage } from '@/features/registered/components/premium-upsell-page';

export const metadata: Metadata = {
  title: 'Premium',
};

export default function PremiumPage(): React.ReactElement {
  return (
    <RequireRegistered>
      <PremiumUpsellPage />
    </RequireRegistered>
  );
}
