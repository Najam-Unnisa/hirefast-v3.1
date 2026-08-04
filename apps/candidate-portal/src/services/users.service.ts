import { apiClient } from '@/services/api-client';

export interface CompleteProfileInput {
  firstName: string;
  lastName: string;
}

export interface CompleteProfileResponse {
  id: string;
  email: string;
  status: string;
  role: { name: string };
  profile: {
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    isComplete: boolean;
  } | null;
}

export async function completeGuestProfile(
  input: CompleteProfileInput,
): Promise<CompleteProfileResponse> {
  return apiClient.post<CompleteProfileResponse>('/users/me/profile/complete', input);
}

export async function getMyProfile() {
  return apiClient.get('/users/me/profile');
}
