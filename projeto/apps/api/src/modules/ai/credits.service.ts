import { and, count, desc, eq, gt, lte, sql } from 'drizzle-orm';
import type { AiOperation, PaginationQuery } from '@commercialpipe/shared-types';
import { AI_CREDIT_COSTS } from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { aiUsageLog, auditLogs, tenants } from '../../shared/database/schema.js';
import { PaymentRequiredError } from '../../shared/errors/app-error.js';

function firstOfNextMonth(from: Date): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1, 0, 0, 0));
}

/** Reset monthly credits lazily if the reset date has passed (rule 15). */
export async function resetCreditsIfDue(tenantId: string): Promise<void> {
  const now = new Date();
  await db
    .update(tenants)
    .set({ aiCreditsUsed: 0, aiCreditsResetAt: firstOfNextMonth(now) })
    .where(and(eq(tenants.id, tenantId), lte(tenants.aiCreditsResetAt, now)));
}

export async function resetAllDueCredits(): Promise<number> {
  const now = new Date();
  const rows = await db
    .update(tenants)
    .set({ aiCreditsUsed: 0, aiCreditsResetAt: firstOfNextMonth(now) })
    .where(lte(tenants.aiCreditsResetAt, now))
    .returning({ id: tenants.id });
  return rows.length;
}

export interface CreditsBalance {
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
}

export async function getBalance(tenantId: string): Promise<CreditsBalance> {
  await resetCreditsIfDue(tenantId);
  const [tenant] = await db
    .select({
      limit: tenants.aiCreditsLimit,
      used: tenants.aiCreditsUsed,
      resetAt: tenants.aiCreditsResetAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const limit = tenant?.limit ?? 0;
  const used = tenant?.used ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used), resetAt: tenant?.resetAt ?? new Date() };
}

export function operationCost(operation: AiOperation): number {
  return AI_CREDIT_COSTS[operation];
}

/** Rule 13: verify balance before invoking the AI provider. */
export async function ensureCredits(tenantId: string, operation: AiOperation): Promise<void> {
  const balance = await getBalance(tenantId);
  if (balance.remaining < operationCost(operation)) {
    throw new PaymentRequiredError(
      `Créditos de IA insuficientes (necessário ${operationCost(operation)}, disponível ${balance.remaining})`,
    );
  }
}

export interface CommitOptions {
  userId?: string | null;
  leadId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Rule 14: decrement credits atomically and log usage. Returns new balance. */
export async function commitCredits(
  tenantId: string,
  operation: AiOperation,
  options: CommitOptions = {},
): Promise<CreditsBalance> {
  const cost = operationCost(operation);
  const counterDelta = Math.ceil(cost);

  const [updated] = await db
    .update(tenants)
    .set({ aiCreditsUsed: sql`${tenants.aiCreditsUsed} + ${counterDelta}` })
    .where(
      and(
        eq(tenants.id, tenantId),
        lte(sql`${tenants.aiCreditsUsed} + ${counterDelta}`, tenants.aiCreditsLimit),
      ),
    )
    .returning({ used: tenants.aiCreditsUsed, limit: tenants.aiCreditsLimit, resetAt: tenants.aiCreditsResetAt });

  if (!updated) {
    throw new PaymentRequiredError('Créditos de IA esgotados durante a operação');
  }

  await db.insert(aiUsageLog).values({
    tenantId,
    userId: options.userId ?? null,
    leadId: options.leadId ?? null,
    operation,
    creditsCost: cost.toFixed(2),
    metadata: options.metadata ?? null,
  });

  await maybeNotifyThreshold(tenantId, updated.used, updated.limit, counterDelta);

  return {
    limit: updated.limit,
    used: updated.used,
    remaining: Math.max(0, updated.limit - updated.used),
    resetAt: updated.resetAt,
  };
}

async function maybeNotifyThreshold(
  tenantId: string,
  used: number,
  limit: number,
  delta: number,
): Promise<void> {
  if (limit <= 0) return;
  const before = used - delta;
  const pct = (v: number) => v / limit;
  const crossed = (threshold: number) => pct(before) < threshold && pct(used) >= threshold;

  for (const threshold of [0.8, 1]) {
    if (crossed(threshold)) {
      await db.insert(auditLogs).values({
        tenantId,
        userId: null,
        action: 'ai.credits_threshold',
        entityType: 'tenant',
        entityId: tenantId,
        newValue: { threshold: threshold * 100, used, limit },
      });
    }
  }
}

export async function listUsage(tenantId: string, query: PaginationQuery) {
  const offset = (query.page - 1) * query.limit;
  const where = eq(aiUsageLog.tenantId, tenantId);
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(aiUsageLog)
      .where(where)
      .orderBy(desc(aiUsageLog.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(aiUsageLog).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}

// re-exported helpers used by other modules for capability checks
export { gt };
