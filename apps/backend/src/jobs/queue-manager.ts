import { Queue, type ConnectionOptions, type DefaultJobOptions } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * BullMQ Queue Manager — foundation only.
 * Actual job processors are registered by future feature modules.
 */

const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

export function getBullConnection(): ConnectionOptions {
  return {
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password || undefined,
    maxRetriesPerRequest: null,
  };
}

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  const existing = queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection: getBullConnection(),
    defaultJobOptions,
  });

  queues.set(name, queue);
  logger.info('Queue registered', { queue: name });
  return queue;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
  logger.info('All queues closed');
}

/**
 * Known queue names — processors not implemented yet.
 */
export const QUEUE_NAMES = {
  AI_EVALUATION: 'ai-evaluation',
  REPORT_GENERATION: 'report-generation',
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function registerDefaultQueues(): void {
  Object.values(QUEUE_NAMES).forEach((name) => {
    getQueue(name);
  });
}
