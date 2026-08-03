import { Worker, type Processor, type WorkerOptions } from 'bullmq';
import { getBullConnection } from './queue-manager';
import { logger } from '../utils/logger';

const workers: Worker[] = [];

/**
 * Worker configuration helpers.
 * Do not register real job processors during project initialization.
 */
export function createWorker<T = unknown, R = unknown>(
  queueName: string,
  processor: Processor<T, R>,
  options?: Omit<WorkerOptions, 'connection'>,
): Worker<T, R> {
  const worker = new Worker<T, R>(queueName, processor, {
    connection: getBullConnection(),
    ...options,
  });

  worker.on('completed', (job) => {
    logger.info('Job completed', { queue: queueName, jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error('Job failed', {
      queue: queueName,
      jobId: job?.id,
      error,
    });
  });

  workers.push(worker as Worker);
  logger.info('Worker created', { queue: queueName });
  return worker;
}

export async function closeAllWorkers(): Promise<void> {
  await Promise.all(workers.map((worker) => worker.close()));
  workers.length = 0;
  logger.info('All workers closed');
}

/**
 * Placeholder for future job registration.
 * Feature modules will call this to attach processors.
 */
export function registerJobs(): void {
  logger.info('Job registration skipped — no feature jobs in foundation');
}
