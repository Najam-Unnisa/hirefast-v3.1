import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface TrackEventInput {
  eventName: string;
  userId?: string;
  properties?: Prisma.InputJsonValue;
}

/**
 * Records product analytics without delaying or failing the request that emitted it.
 */
export function trackEvent({ eventName, userId, properties }: TrackEventInput): void {
  void prisma.analyticsEvent
    .create({
      data: {
        eventName,
        ...(userId ? { userId } : {}),
        ...(properties !== undefined ? { properties } : {}),
      },
    })
    .catch((error: unknown) => {
      logger.warn('Analytics event could not be recorded', { eventName, userId, error });
    });
}
