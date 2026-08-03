import { Router } from 'express';
import { healthRouter } from '../modules/health/routes/health.routes';

/**
 * Global API v1 router.
 * Feature modules register routes here as they are implemented.
 */
export const v1Router = Router();

v1Router.use('/health', healthRouter);

// Future module registration:
// v1Router.use('/auth', authRouter);
// v1Router.use('/users', usersRouter);
// v1Router.use('/assessments', assessmentsRouter);

export function registerRoutes(appRouter: Router): void {
  appRouter.use('/health', healthRouter);
}
