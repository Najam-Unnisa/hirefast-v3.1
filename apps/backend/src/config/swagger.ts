import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'HireFast API',
      version: '1.0.0',
      description:
        'HireFast AI-powered employability assessment platform API. Foundation documentation only.',
      contact: {
        name: 'HireFast Engineering',
      },
    },
    servers: [
      {
        url: `${env.apiUrl}${env.apiPrefix}`,
        description: 'API v1',
      },
      {
        url: env.apiUrl,
        description: 'Root (health)',
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
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ApiErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
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
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
