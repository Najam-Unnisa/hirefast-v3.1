'use client';

import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ToastNotifier } from '@/components/providers/toast-provider';

export function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <ToastNotifier />
      </AuthProvider>
    </QueryProvider>
  );
}
