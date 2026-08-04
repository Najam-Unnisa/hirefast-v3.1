import type { Prisma } from '@prisma/client';
import { trackEvent } from '../../../services/analytics.service';
import { BadRequestError } from '../../../utils/errors';

const ALLOWED_EVENTS = new Set([
  'landing.page_viewed',
  'auth.google_sign_in_started',
  'auth.google_sign_in_completed',
  'guest.account_created',
  'assessment.started',
  'assessment.auto_saved',
  'assessment.completed',
  'assessment.submitted',
  'assessment.resumed',
  'evaluation.started',
  'evaluation.completed',
  'results.locked_viewed',
  'registration.cta_clicked',
  'dashboard.viewed',
  'premium.dashboard_viewed',
  'profile.updated',
  'resume.uploaded',
  'ai_report.viewed',
  'jrs.viewed',
  'skill_scores.viewed',
  'skill_analytics.viewed',
  'progress_tracking.viewed',
  'learning_recommendations.viewed',
  'gamification.badge_earned',
  'gamification.level_up',
  'gamification.daily_streak_updated',
  'premium.upgrade_cta_clicked',
  'premium.activated',
  'premium.downgraded',
  'premium.assessment_started',
  'premium.assessment_completed',
  'premium.report_viewed',
  'premium.feature_engagement',
  'admin.login',
  'admin.dashboard_viewed',
  'admin.candidate_viewed',
  'admin.assessment_created',
  'admin.assessment_updated',
  'admin.assessment_published',
  'admin.question_created',
  'admin.question_updated',
  'admin.report_generated',
  'admin.platform_settings_updated',
  'admin.audit_log_viewed',
  'admin.hr_review_completed',
]);

export class AnalyticsIngestService {
  ingest(eventName: unknown, userId: string | undefined, properties: unknown) {
    if (typeof eventName !== 'string' || !ALLOWED_EVENTS.has(eventName)) {
      throw new BadRequestError('Unsupported analytics event.');
    }

    trackEvent({
      eventName,
      userId,
      properties:
        properties === undefined || properties === null
          ? undefined
          : (properties as Prisma.InputJsonValue),
    });

    return { recorded: true as const, eventName };
  }
}

export const analyticsIngestService = new AnalyticsIngestService();
