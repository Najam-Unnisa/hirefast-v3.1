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
  'evaluation.started',
  'evaluation.completed',
  'results.locked_viewed',
  'registration.cta_clicked',
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
