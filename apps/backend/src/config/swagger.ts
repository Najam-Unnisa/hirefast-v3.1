/**
 * Serve the normative HireFast OpenAPI contract from docs/api/openapi.yaml.
 * Documentation wiring only — no business route implementation.
 */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';

function resolveOpenApiPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '../../docs/api/openapi.yaml'),
    path.resolve(process.cwd(), 'docs/api/openapi.yaml'),
    path.resolve(__dirname, '../../../../docs/api/openapi.yaml'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export function loadOpenApiSpec(): Record<string, unknown> {
  const filePath = resolveOpenApiPath();
  if (!filePath) {
    logger.warn('OpenAPI contract file not found; using minimal stub');
    return {
      openapi: '3.0.3',
      info: {
        title: 'HireFast API',
        version: '1.0.0',
        description: 'Contract file missing — see docs/api/openapi.yaml',
      },
      paths: {},
    };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const spec = yaml.load(raw) as Record<string, unknown>;
  logger.info('OpenAPI contract loaded', { path: filePath });
  return spec;
}

/** Normative Swagger/OpenAPI document for `/docs`. */
export const swaggerSpec = loadOpenApiSpec();
