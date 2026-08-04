import { Router } from 'express';
import { healthRouter } from '../modules/health/routes/health.routes';

/**
 * Global API v1 router.
 * Feature modules register routes here during Feature Implementation.
 * Authentication Foundation (JWT/middleware/providers) exists; auth HTTP APIs are not mounted yet.
 */
export const v1Router = Router();

v1Router.use('/health', healthRouter);

// Feature Implementation (deferred):
// v1Router.use('/auth', authRouter);
// v1Router.use('/users', usersRouter);
// v1Router.use('/assessments', assessmentsRouter);

export function registerRoutes(appRouter: Router): void {
  appRouter.use('/health', healthRouter);
}
