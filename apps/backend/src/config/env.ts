import { config as loadEnv } from 'dotenv';
import path from 'path';
import { getEnv, getEnvBoolean, getEnvNumber, getEnvOptional } from '@hirefast/shared-config';

// Load monorepo root .env first, then local overrides.
loadEnv({ path: path.resolve(process.cwd(), '../../.env') });
loadEnv({ path: path.resolve(process.cwd(), '.env') });

const corsOrigins = getEnvOptional('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: getEnvOptional('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  appName: getEnvOptional('APP_NAME', 'HireFast'),
  port: getEnvNumber('PORT', 4000),
  apiPrefix: getEnvOptional('API_PREFIX', '/api/v1'),
  appUrl: getEnvOptional('APP_URL', 'http://localhost:3000'),
  adminUrl: getEnvOptional('ADMIN_URL', 'http://localhost:3001'),
  apiUrl: getEnvOptional('API_URL', 'http://localhost:4000'),
  logLevel: getEnvOptional('LOG_LEVEL', 'debug'),

  databaseUrl: getEnv(
    'DATABASE_URL',
    'postgresql://hirefast:hirefast@localhost:5432/hirefast?schema=public',
  ),

  redis: {
    url: getEnvOptional('REDIS_URL', 'redis://localhost:6379'),
    host: getEnvOptional('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnvOptional('REDIS_PASSWORD', ''),
  },

  jwt: {
    accessSecret: getEnv('JWT_ACCESS_SECRET', 'change-me-access-secret-min-32-chars-long'),
    refreshSecret: getEnv('JWT_REFRESH_SECRET', 'change-me-refresh-secret-min-32-chars-long'),
    accessExpiresIn: getEnvOptional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: getEnvOptional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  google: {
    clientId: getEnvOptional('GOOGLE_CLIENT_ID'),
    clientSecret: getEnvOptional('GOOGLE_CLIENT_SECRET'),
    callbackUrl: getEnvOptional(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:4000/api/v1/auth/google/callback',
    ),
  },

  openai: {
    apiKey: getEnvOptional('OPENAI_API_KEY'),
    model: getEnvOptional('OPENAI_MODEL', 'gpt-4o'),
    orgId: getEnvOptional('OPENAI_ORG_ID'),
  },

  r2: {
    accountId: getEnvOptional('R2_ACCOUNT_ID'),
    accessKeyId: getEnvOptional('R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnvOptional('R2_SECRET_ACCESS_KEY'),
    bucketName: getEnvOptional('R2_BUCKET_NAME', 'hirefast'),
    publicUrl: getEnvOptional('R2_PUBLIC_URL'),
    endpoint: getEnvOptional('R2_ENDPOINT'),
  },

  corsOrigins,

  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900_000),
    max: getEnvNumber('RATE_LIMIT_MAX', 100),
  },

  swaggerEnabled: getEnvBoolean('SWAGGER_ENABLED', true),
} as const;

export type Env = typeof env;
