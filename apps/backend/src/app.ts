import express, { type Application, type Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { v1Router } from './routes';
import { healthRouter } from './modules/health/routes/health.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  if (!env.isProduction) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  app.use(
    rateLimit({
      windowMs: env.rateLimit.windowMs,
      max: env.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests. Please try again later.',
        errors: [{ message: 'Rate limit exceeded', code: 'RATE_LIMIT' }],
      },
    }),
  );

  // Root health check (success criteria: GET /health)
  app.use('/health', healthRouter);

  // Versioned API
  app.use(env.apiPrefix, v1Router);

  if (env.swaggerEnabled) {
    app.use(
      '/docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'HireFast API Docs',
        swaggerOptions: {
          persistAuthorization: true,
        },
      }),
    );
    app.get('/docs.json', (_req, res) => {
      res.json(swaggerSpec);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export type { Application, Router };
