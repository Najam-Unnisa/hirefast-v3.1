import type { Metadata } from 'next';
import { RequireGuest } from '@/components/guards/require-guest';
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
    <RequireGuest>
      <ProcessingPanel attemptId={attemptId} />
    </RequireGuest>
  );
}
