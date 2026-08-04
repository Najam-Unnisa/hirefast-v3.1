import { createApiClient } from '@hirefast/shared-ui';
import { API_BASE_URL } from '@/constants/app';
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  saveSessionTokens,
} from '@/lib/session';

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSessionTokens();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { accessToken: string; refreshToken: string; expiresIn: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        clearSessionTokens();
        return false;
      }
      saveSessionTokens(payload.data);
      return true;
    } catch {
      clearSessionTokens();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Portal-configured API client with Bearer auth + single refresh retry. */
export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getHeaders: (): HeadersInit => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      return {};
    }
    return { Authorization: `Bearer ${accessToken}` };
  },
  onUnauthorized: refreshSession,
});

export type { ApiClient, ApiClientConfig } from '@hirefast/shared-ui';
export { ApiClientError } from '@hirefast/shared-ui';
