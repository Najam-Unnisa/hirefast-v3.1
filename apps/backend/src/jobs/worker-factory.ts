import { Worker, type Processor, type WorkerOptions } from 'bullmq';
import { getBullConnection } from './queue-manager';
import { logger } from '../utils/logger';

/**
 * Worker factory — foundation helper for Feature Implementation modules.
 *
 * Feature modules call `createWorker` when they own a processor, e.g.:
 *   - Assessment module → AI evaluation worker
 *   - Reporting module → report generation worker
 *   - Notification / Email modules → their workers
 *
 * The API process does NOT centrally register business workers at boot.
 * There is no `registerJobs()` placeholder — workers are feature-owned.
 *
 * See: docs/architecture/BULLMQ_FOUNDATION.md
 */

const workers: Worker[] = [];

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
  logger.info('Worker registered by feature module', { queue: queueName });
  return worker;
}

/**
 * Graceful shutdown helper — closes any workers that feature modules registered
 * in this process (none during foundation-only boot).
 */
export async function closeAllWorkers(): Promise<void> {
  if (workers.length === 0) {
    logger.info('No feature workers to close');
    return;
  }

  await Promise.all(workers.map((worker) => worker.close()));
  workers.length = 0;
  logger.info('All workers closed');
}

export function getActiveWorkerCount(): number {
  return workers.length;
}
