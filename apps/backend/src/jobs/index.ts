/**
 * Jobs package — platform queue infrastructure + worker factory helpers.
 *
 * Foundation (implemented):
 *   - Redis connection options for BullMQ
 *   - Queue manager / factory
 *   - Platform queue name constants
 *   - Worker factory for future feature modules
 *
 * Feature Implementation (deferred):
 *   - AI evaluation / report / email / notification processors
 *   - Per-module worker registration at module init
 *
 * Do not add business processors in this package.
 */
export {
  QUEUE_NAMES,
  closeAllQueues,
  getBullConnection,
  getQueue,
  initializePlatformQueues,
  type QueueName,
} from './queue-manager';

export { closeAllWorkers, createWorker, getActiveWorkerCount } from './worker-factory';
