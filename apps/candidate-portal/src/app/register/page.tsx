import type { Metadata } from 'next';
import { RequireAuth } from '@/components/guards/require-auth';
import { RegistrationHandoffForm } from '@/features/guest/components/registration-handoff-form';

export const metadata: Metadata = {
  title: 'Complete registration',
};

export default function RegisterPage(): React.ReactElement {
  return (
    <RequireAuth>
      <RegistrationHandoffForm />
    </RequireAuth>
  );
}
