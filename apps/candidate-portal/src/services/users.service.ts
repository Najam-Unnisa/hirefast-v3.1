import { apiClient } from '@/services/api-client';

export interface CompleteProfileInput {
  firstName: string;
  lastName: string;
}

export async function completeGuestProfile(input: CompleteProfileInput) {
  return apiClient.post('/users/me/profile/complete', input);
}

export async function getMyProfile() {
  return apiClient.get('/users/me/profile');
}
