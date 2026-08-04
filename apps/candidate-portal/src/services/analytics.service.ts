import { API_BASE_URL } from '@/constants/app';
import { getAccessToken } from '@/lib/session';

export type AnalyticsEventName =
  | 'landing.page_viewed'
  | 'auth.google_sign_in_started'
  | 'auth.google_sign_in_completed'
  | 'guest.account_created'
  | 'assessment.started'
  | 'assessment.auto_saved'
  | 'assessment.completed'
  | 'assessment.submitted'
  | 'evaluation.started'
  | 'evaluation.completed'
  | 'results.locked_viewed'
  | 'registration.cta_clicked';

/**
 * Fire-and-forget client analytics for guest funnel measurement.
 */
export function trackClientEvent(
  eventName: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;

  const accessToken = getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  void fetch(`${API_BASE_URL}/analytics/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never block the guest experience.
  });
}
