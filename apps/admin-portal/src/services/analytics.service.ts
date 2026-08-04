import { API_BASE_URL } from '@/constants/app';
import { getAccessToken } from '@/lib/session';

export type AdminAnalyticsEventName =
  | 'admin.login'
  | 'admin.dashboard_viewed'
  | 'admin.candidate_viewed'
  | 'admin.assessment_created'
  | 'admin.assessment_published'
  | 'admin.assessment_updated'
  | 'admin.question_created'
  | 'admin.report_generated'
  | 'admin.audit_log_viewed'
  | 'admin.platform_settings_updated'
  | 'admin.hr_review_completed'
  | 'admin.evaluation_retry'
  | 'admin.settings_viewed'
  | 'admin.skills_viewed';

/**
 * Fire-and-forget client analytics for admin operational events.
 * Posts to the admin ingest endpoint (ADMIN role required).
 */
export function trackClientEvent(
  eventName: AdminAnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;

  const accessToken = getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  void fetch(`${API_BASE_URL}/admin/analytics/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never block admin workflows.
  });
}
