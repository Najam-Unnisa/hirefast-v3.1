/**
 * Runtime Swagger — documents only Express routes that are currently implemented.
 *
 * The full HireFast API architecture contract remains at:
 *   docs/api/openapi.yaml
 * That file is the design-time source of truth for FE/BE planning and is NOT
 * served from `/docs` until matching routes are implemented.
 *
 * @see docs/api/CONTRACT_VS_RUNTIME.md
 */
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const routeGlobTs = path.join(__dirname, '../modules/**/*.routes.ts');
const routeGlobJs = path.join(__dirname, '../modules/**/*.routes.js');

const runtimeDefinition: swaggerJsdoc.Options['definition'] = {
  openapi: '3.0.3',
  info: {
    title: 'HireFast API (Implemented)',
    version: '1.0.0',
    description: [
      '**Runtime documentation** — endpoints currently implemented by the Express server.',
      '',
      'This Swagger UI does **not** list the full HireFast API surface.',
      'Unimplemented contract endpoints are omitted intentionally to avoid contract drift.',
      '',
      '### Target architecture contract',
      'The complete OpenAPI specification (design-time / roadmap) lives in the repository at',
      '`docs/api/openapi.yaml`. It is the authoritative architecture contract for future',
      'development. Routes will be added to this runtime document incrementally as modules',
      'are implemented per the HireFast development roadmap.',
      '',
      'See also: `docs/api/CONTRACT_VS_RUNTIME.md`, `docs/api/ENDPOINT_CATALOG.md`.',
    ].join('\n'),
    contact: {
      name: 'HireFast Engineering',
    },
  },
  servers: [
    {
      url: env.apiUrl,
      description: 'HireFast API server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiSuccessResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      ApiErrorResponse: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' },
              },
            },
          },
        },
      },
      HealthCheckData: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
          timestamp: { type: 'string', format: 'date-time' },
          environment: { type: 'string' },
          services: {
            type: 'object',
            properties: {
              api: { type: 'string', enum: ['up', 'down', 'degraded'] },
              database: { type: 'string', enum: ['up', 'down', 'degraded'] },
              redis: { type: 'string', enum: ['up', 'down', 'degraded'] },
            },
          },
          version: { type: 'string' },
        },
      },
    },
  },
};

/**
 * OpenAPI document generated from JSDoc on implemented route modules only.
 */
export const swaggerSpec = swaggerJsdoc({
  definition: runtimeDefinition,
  apis: [routeGlobTs, routeGlobJs],
});
