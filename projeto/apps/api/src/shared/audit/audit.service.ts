import { and, count, desc, eq } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../database/client.js';
import { auditLogs, users } from '../database/schema.js';

export interface AuditContext {
  tenantId: string;
  userId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

type AuditExecutor = Pick<Database, 'insert'>;

export async function recordAudit(
  db: AuditExecutor,
  ctx: AuditContext,
  entry: AuditEntry,
): Promise<void> {
  await db.insert(auditLogs).values({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    ipAddress: ctx.ipAddress ?? null,
    userAgent: ctx.userAgent ?? null,
  });
}

export async function listAuditLogs(
  tenantId: string,
  query: { page: number; limit: number; action?: string },
) {
  const offset = (query.page - 1) * query.limit;
  const filters = [eq(auditLogs.tenantId, tenantId)];
  if (query.action) filters.push(eq(auditLogs.action, query.action));
  const where = and(...filters);

  const [rows, [totals]] = await Promise.all([
    defaultDb
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        oldValue: auditLogs.oldValue,
        newValue: auditLogs.newValue,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(query.limit)
      .offset(offset),
    defaultDb.select({ value: count() }).from(auditLogs).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}
