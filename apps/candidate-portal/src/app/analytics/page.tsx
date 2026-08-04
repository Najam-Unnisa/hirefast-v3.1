import type { Metadata } from 'next';
import { RequireRegistered } from '@/components/guards/require-registered';
import { SkillAnalyticsPanel } from '@/features/registered/components/skill-analytics-panel';

export const metadata: Metadata = {
  title: 'Skill Analytics',
};

export default function AnalyticsPage(): React.ReactElement {
  return (
    <RequireRegistered>
      <SkillAnalyticsPanel />
    </RequireRegistered>
  );
}
