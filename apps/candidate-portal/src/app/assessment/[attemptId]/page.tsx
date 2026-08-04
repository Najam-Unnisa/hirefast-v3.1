import type { Metadata } from 'next';
import { RequireGuest } from '@/components/guards/require-guest';
import { AssessmentPlayer } from '@/features/guest/components/assessment-player';

export const metadata: Metadata = {
  title: 'Assessment',
};

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}): Promise<React.ReactElement> {
  const { attemptId } = await params;
  return (
    <RequireGuest>
      <AssessmentPlayer attemptId={attemptId} />
    </RequireGuest>
  );
}
