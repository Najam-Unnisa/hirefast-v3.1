'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { UserRoleValue } from '@hirefast/shared-types';

/**
 * Authentication context — reusable foundation only.
 * Login / session Feature Implementation belongs in portal feature modules.
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRoleValue;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading] = useState(false);

  // Stable identity — SessionProvider depends on clearUser in refreshUser/useEffect.
  // Recreating clearUser when `user` changes caused an infinite GET /auth/me loop.
  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      setUser,
      clearUser,
    }),
    [user, isLoading, clearUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
