import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { closeAllQueues, closeAllWorkers, initializePlatformQueues } from './jobs';
import { logger } from './utils/logger';

/**
 * API process bootstrap — platform infrastructure only.
 *
 * Startup initializes Redis + BullMQ queues. Feature modules register their
 * own workers when those modules are implemented (not during foundation boot).
 */
async function bootstrap(): Promise<void> {
  const app = createApp();

  try {
    await connectDatabase();
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', { error });
    if (env.isProduction) {
      process.exit(1);
    }
    logger.warn('Continuing without database connection (development mode)');
  }

  try {
    await connectRedis();
    initializePlatformQueues();
  } catch (error) {
    logger.error('Failed to connect to Redis / initialize queues', { error });
    if (env.isProduction) {
      process.exit(1);
    }
    logger.warn('Continuing without Redis (development mode)');
  }

  const server = app.listen(env.port, () => {
    logger.info(`${env.appName} API listening`, {
      port: env.port,
      env: env.nodeEnv,
      apiPrefix: env.apiPrefix,
      docs: `${env.apiUrl}/docs`,
      health: `${env.apiUrl}/health`,
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      try {
        await closeAllWorkers();
        await closeAllQueues();
        await disconnectRedis();
        await disconnectDatabase();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  logger.error('Fatal bootstrap error', { error });
  process.exit(1);
});
