import { createApiClient } from '@hirefast/shared-ui';
import { API_BASE_URL } from '@/constants/app';

/** Portal-configured API client (shared infrastructure + portal base URL). */
export const apiClient = createApiClient({ baseUrl: API_BASE_URL });

export { ApiClientError, type ApiClient, type ApiClientConfig } from '@hirefast/shared-ui';
