import type { ApiResponse } from '@hirefast/shared-types';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: { field?: string; message: string; code?: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface ApiClientConfig {
  /** API origin including version prefix, e.g. http://localhost:4000/api/v1 */
  baseUrl: string;
  /** Optional default headers merged into every request */
  defaultHeaders?: HeadersInit;
  /** Optional per-request auth/header resolver (e.g. Bearer access token) */
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  /** Optional 401 recovery hook; return true to retry the original request once */
  onUnauthorized?: () => Promise<boolean>;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip the unauthorized recovery hook for this request */
  skipAuthRetry?: boolean;
}

export interface ApiClient {
  get: <T>(path: string, options?: RequestOptions) => Promise<T>;
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  delete: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

/**
 * Shared fetch client used by both portals.
 * Pass portal-specific `baseUrl` (and later auth headers) at creation time.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  const { baseUrl, defaultHeaders, getHeaders, onUnauthorized } = config;

  async function request<T>(
    path: string,
    options: RequestOptions = {},
    isRetry = false,
  ): Promise<T> {
    const { body, headers, skipAuthRetry, ...rest } = options;
    const dynamicHeaders = getHeaders ? await getHeaders() : undefined;
    const response = await fetch(`${baseUrl}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...defaultHeaders,
        ...dynamicHeaders,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = (await response.json()) as ApiResponse<T>;

    if (response.status === 401 && !isRetry && !skipAuthRetry && onUnauthorized) {
      const recovered = await onUnauthorized();
      if (recovered) {
        return request<T>(path, options, true);
      }
    }

    if (!response.ok || !payload.success) {
      const errorPayload = payload as Extract<ApiResponse<T>, { success: false }>;
      throw new ApiClientError(
        errorPayload.message || 'Request failed',
        response.status,
        errorPayload.errors ?? [],
      );
    }

    return payload.data;
  }

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>(path, { ...options, method: 'POST', body }),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>(path, { ...options, method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>(path, { ...options, method: 'DELETE' }),
  };
}
