import { apiClient } from '@/services/api-client';
import type { CompleteProfileInput } from '@/services/users.service';

export type { CompleteProfileInput };

export interface ProfilePayload {
  id: string;
  email: string;
  status: string;
  role: { name: string };
  profile: {
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    phone: string | null;
    headline: string | null;
    bio: string | null;
    locale: string | null;
    timezone: string | null;
    countryCode: string | null;
    isComplete: boolean;
    educationSummary?: string | null;
    skillsSummary?: string | null;
  } | null;
  resume: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  } | null;
}

export async function fetchMyProfile(): Promise<ProfilePayload> {
  return apiClient.get<ProfilePayload>('/users/me/profile');
}

export async function updateMyProfile(body: Record<string, unknown>) {
  return apiClient.patch('/users/me/profile', body);
}

export async function uploadResume(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string;
}) {
  return apiClient.put('/users/me/resume', input);
}

export async function completeGuestProfile(input: CompleteProfileInput) {
  return apiClient.post('/users/me/profile/complete', input);
}
