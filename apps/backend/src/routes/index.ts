import { Router } from 'express';
import { healthRouter } from '../modules/health/routes/health.routes';
import { authRouter } from '../modules/auth/routes/auth.routes';
import {
  assessmentsRouter,
  attemptsRouter,
} from '../modules/assessments/routes/assessments.routes';
import { usersRouter } from '../modules/users/routes/users.routes';
import { analyticsRouter } from '../modules/analytics/routes/analytics.routes';
import { dashboardRouter } from '../modules/dashboard/routes/dashboard.routes';
import { gamificationRouter } from '../modules/gamification/routes/gamification.routes';
import { subscriptionsRouter } from '../modules/subscriptions/routes/subscriptions.routes';
import { reportsRouter } from '../modules/reports/routes/reports.routes';

/**
 * Global API v1 router.
 * Feature modules register routes here during Feature Implementation.
 */
export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/assessments', assessmentsRouter);
v1Router.use('/attempts', attemptsRouter);
v1Router.use('/analytics', analyticsRouter);
v1Router.use('/dashboard', dashboardRouter);
v1Router.use('/gamification', gamificationRouter);
v1Router.use('/subscriptions', subscriptionsRouter);
v1Router.use('/reports', reportsRouter);

export function registerRoutes(appRouter: Router): void {
  appRouter.use('/health', healthRouter);
  appRouter.use('/auth', authRouter);
  appRouter.use('/users', usersRouter);
  appRouter.use('/assessments', assessmentsRouter);
  appRouter.use('/attempts', attemptsRouter);
  appRouter.use('/analytics', analyticsRouter);
  appRouter.use('/dashboard', dashboardRouter);
  appRouter.use('/gamification', gamificationRouter);
  appRouter.use('/subscriptions', subscriptionsRouter);
  appRouter.use('/reports', reportsRouter);
}
