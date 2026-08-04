import type { AuthUser } from '@hirefast/shared-ui';
import type { UserRoleValue } from '@hirefast/shared-types';
import { apiClient } from '@/services/api-client';
import type { SessionTokens } from '@/lib/session';

export interface AuthMeResponse {
  id: string;
  email: string;
  role: { name: string };
  profile: {
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    isComplete: boolean;
  } | null;
}

export interface GoogleAuthStartResponse {
  authorizationUrl: string;
  state: string;
}

export function mapAuthUser(me: AuthMeResponse): AuthUser {
  const display =
    me.profile?.displayName ||
    [me.profile?.firstName, me.profile?.lastName].filter(Boolean).join(' ') ||
    undefined;
  return {
    id: me.id,
    email: me.email,
    name: display,
    role: me.role.name as UserRoleValue,
  };
}

export async function startGoogleAuth(): Promise<GoogleAuthStartResponse> {
  return apiClient.post<GoogleAuthStartResponse>('/auth/google', undefined, {
    skipAuthRetry: true,
  });
}

export async function fetchCurrentUser(): Promise<AuthMeResponse> {
  return apiClient.get<AuthMeResponse>('/auth/me');
}

export async function logout(refreshToken: string | null): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken }, { skipAuthRetry: true });
}

export async function createDevGuestSession(email: string): Promise<SessionTokens> {
  return apiClient.post<SessionTokens>('/auth/dev/guest', { email }, { skipAuthRetry: true });
}
