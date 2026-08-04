import { Router } from 'express';
import { healthController } from '../controller/health.controller';

const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Platform health check (root)
 *     description: |
 *       Returns API, database, and Redis status.
 *       Also available at `GET /api/v1/health`.
 *     security: []
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthCheckData'
 *       503:
 *         description: Critical services unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *
 * /api/v1/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Platform health check (versioned)
 *     description: Versioned alias of `GET /health`.
 *     security: []
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthCheckData'
 *       503:
 *         description: Critical services unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
healthRouter.get('/', (req, res, next) => healthController.getHealth(req, res, next));

export { healthRouter };
