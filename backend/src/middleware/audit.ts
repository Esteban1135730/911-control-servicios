import { Request } from 'express';
import { prisma } from '../config';

export async function writeAudit(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  details?: unknown
) {
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action,
      entity,
      entityId,
      details: details as object | undefined,
      ip: req.ip,
    },
  });
}
