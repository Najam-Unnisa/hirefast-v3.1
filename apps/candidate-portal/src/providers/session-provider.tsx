'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth, type AuthUser } from '@hirefast/shared-ui';
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  saveSessionTokens,
  type SessionTokens,
} from '@/lib/session';
import {
  createDevGuestSession,
  fetchCurrentUser,
  logout as logoutRequest,
  mapAuthUser,
  startGoogleAuth,
} from '@/services/auth.service';
import { trackClientEvent } from '@/services/analytics.service';
import { ApiClientError } from '@/services/api-client';

type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

interface SessionContextValue {
  status: SessionStatus;
  user: AuthUser | null;
  isGuest: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  establishSession: (tokens: SessionTokens) => Promise<AuthUser>;
  beginGoogleSignIn: () => Promise<void>;
  beginDevGuestSignIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }): React.ReactElement {
  const { user, setUser, clearUser } = useAuth();
  const [status, setStatus] = useState<SessionStatus>('loading');

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const token = getAccessToken();
    if (!token) {
      clearUser();
      setStatus('anonymous');
      return null;
    }

    try {
      const me = await fetchCurrentUser();
      const mapped = mapAuthUser(me);
      setUser(mapped);
      setStatus('authenticated');
      return mapped;
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
        clearSessionTokens();
        clearUser();
        setStatus('anonymous');
        return null;
      }
      setStatus(getAccessToken() ? 'authenticated' : 'anonymous');
      return null;
    }
  }, [clearUser, setUser]);

  // Mount-only bootstrap (clearUser is now stable in AuthProvider).
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const establishSession = useCallback(
    async (tokens: SessionTokens): Promise<AuthUser> => {
      saveSessionTokens(tokens);
      const me = await fetchCurrentUser();
      const mapped = mapAuthUser(me);
      setUser(mapped);
      setStatus('authenticated');
      return mapped;
    },
    [setUser],
  );

  const beginGoogleSignIn = useCallback(async () => {
    trackClientEvent('auth.google_sign_in_started');
    const { authorizationUrl } = await startGoogleAuth();
    window.location.assign(authorizationUrl);
  }, []);

  const beginDevGuestSignIn = useCallback(
    async (email: string) => {
      const tokens = await createDevGuestSession(email);
      await establishSession(tokens);
      trackClientEvent('guest.account_created', { method: 'dev' });
    },
    [establishSession],
  );

  const signOut = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      await logoutRequest(refreshToken);
    } catch {
      // Ignore logout network failures — clear local session regardless.
    }
    clearSessionTokens();
    clearUser();
    setStatus('anonymous');
  }, [clearUser]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      isGuest: user?.role === 'GUEST',
      refreshUser,
      establishSession,
      beginGoogleSignIn,
      beginDevGuestSignIn,
      signOut,
    }),
    [status, user, refreshUser, establishSession, beginGoogleSignIn, beginDevGuestSignIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
