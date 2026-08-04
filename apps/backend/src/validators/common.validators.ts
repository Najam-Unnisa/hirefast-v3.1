import { z } from 'zod';

/**
 * Shared Zod helpers — foundation validators only.
 */

export const uuidSchema = z.string().uuid('Must be a valid UUID');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
