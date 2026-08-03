import type { HealthCheckResponse } from '@hirefast/shared-types';
import { apiClient } from '@/services/api-client';

export async function fetchHealth(): Promise<HealthCheckResponse> {
  return apiClient.get<HealthCheckResponse>('/health');
}
