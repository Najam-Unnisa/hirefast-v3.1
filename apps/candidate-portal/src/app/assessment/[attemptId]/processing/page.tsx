import type { Metadata } from 'next';
import { RequireAuth } from '@/components/guards/require-auth';
import { ProcessingPanel } from '@/features/guest/components/processing-panel';

export const metadata: Metadata = {
  title: 'Evaluating',
};

export default async function AssessmentProcessingPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}): Promise<React.ReactElement> {
  const { attemptId } = await params;
  return (
    <RequireAuth>
      <ProcessingPanel attemptId={attemptId} />
    </RequireAuth>
  );
}
