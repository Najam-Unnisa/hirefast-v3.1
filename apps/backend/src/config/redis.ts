import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = env.redis.url
    ? new Redis(env.redis.url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
      })
    : new Redis({
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
      });

  redisClient.on('connect', () => logger.info('Redis connecting'));
  redisClient.on('ready', () => logger.info('Redis ready'));
  redisClient.on('error', (error) => logger.error('Redis error', { error }));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (client.status === 'wait' || client.status === 'end') {
    await client.connect();
  }
  logger.info('Redis connected');
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient) return;
  await redisClient.quit();
  redisClient = null;
  logger.info('Redis disconnected');
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready') {
      if (client.status === 'wait' || client.status === 'end') {
        await client.connect();
      }
    }
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
}

export class RedisService {
  constructor(private readonly client: Redis = getRedisClient()) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }
    await this.client.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
}

export const redisService = new RedisService();
