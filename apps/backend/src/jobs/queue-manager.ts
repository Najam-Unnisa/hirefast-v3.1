import { Queue, type ConnectionOptions, type DefaultJobOptions } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * BullMQ Queue Manager — platform foundation.
 *
 * Owns queue creation, Redis connection options, and default job options.
 * Does NOT register job processors. Feature modules enqueue work here and
 * register their own workers via `createWorker` during Feature Implementation.
 *
 * See: docs/architecture/BULLMQ_FOUNDATION.md
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

/**
 * Lazy queue factory — returns an existing Queue or creates one.
 * Safe to call from feature modules when enqueueing jobs.
 */
export function getQueue(name: string): Queue {
  const existing = queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection: getBullConnection(),
    defaultJobOptions,
  });

  queues.set(name, queue);
  logger.info('Queue initialized', { queue: name });
  return queue;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
  logger.info('All queues closed');
}

/**
 * Platform queue names reserved for known async workloads.
 * Processors are owned by feature modules — not registered at foundation boot.
 */
export const QUEUE_NAMES = {
  AI_EVALUATION: 'ai-evaluation',
  REPORT_GENERATION: 'report-generation',
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Warm platform queues at API startup so Redis + BullMQ infrastructure is ready.
 * This is queue infrastructure only — no workers are started here.
 */
export function initializePlatformQueues(): void {
  Object.values(QUEUE_NAMES).forEach((name) => {
    getQueue(name);
  });
  logger.info('Platform queue infrastructure ready', {
    queues: Object.values(QUEUE_NAMES),
  });
}
