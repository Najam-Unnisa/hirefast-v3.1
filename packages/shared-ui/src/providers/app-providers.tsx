'use client';

import { QueryProvider } from './query-provider';
import { AuthProvider } from './auth-provider';
import { ToastNotifier } from './toast-provider';

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
