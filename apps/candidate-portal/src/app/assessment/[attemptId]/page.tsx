import type { Metadata } from 'next';
import { RequireAuth } from '@/components/guards/require-auth';
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
    <RequireAuth>
      <AssessmentPlayer attemptId={attemptId} />
    </RequireAuth>
  );
}
