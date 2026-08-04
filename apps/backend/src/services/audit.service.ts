import type { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface WriteAuditLogInput {
  actorId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  message: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Fire-and-forget friendly audit writer used by Admin Portal actions. */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      message: input.message,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export function requestAuditContext(req: { ip?: string; headers: { 'user-agent'?: string } }): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress: typeof req.ip === 'string' ? req.ip : null,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  };
}
