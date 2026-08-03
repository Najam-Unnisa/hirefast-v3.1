import { Router } from 'express';
import { healthController } from '../controller/health.controller';

const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Platform health check
 *     description: Returns API, database, and Redis status.
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *       503:
 *         description: Critical services unavailable
 */
healthRouter.get('/', (req, res, next) => healthController.getHealth(req, res, next));

export { healthRouter };
