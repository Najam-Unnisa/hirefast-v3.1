import type { Metadata } from 'next';
import { RequireRegistered } from '@/components/guards/require-registered';
import { AssessmentCatalog } from '@/features/registered/components/assessment-catalog';

export const metadata: Metadata = {
  title: 'Assessments',
};

export default function AssessmentsPage(): React.ReactElement {
  return (
    <RequireRegistered>
      <AssessmentCatalog />
    </RequireRegistered>
  );
}
