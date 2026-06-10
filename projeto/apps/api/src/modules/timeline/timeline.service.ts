import { and, asc, count, desc, eq } from 'drizzle-orm';
import type { ListTimelineQuery, TimelineType } from '@commercialpipe/shared-types';
import { db, type Database } from '../../shared/database/client.js';
import { leads, timelineEntries } from '../../shared/database/schema.js';

type Executor = Pick<Database, 'insert' | 'update'>;

export interface AddTimelineInput {
  tenantId: string;
  leadId: string;
  type: TimelineType;
  content: string;
  metadata?: Record<string, unknown> | null;
  aiGenerated?: boolean;
  createdBy?: string | null;
}

/**
 * Append an immutable timeline entry and bump the lead's last_activity_at (rule 8).
 * Accepts an executor so it can run inside a caller's transaction.
 */
export async function addTimelineEntry(input: AddTimelineInput, executor: Executor = db) {
  const [entry] = await executor
    .insert(timelineEntries)
    .values({
      tenantId: input.tenantId,
      leadId: input.leadId,
      type: input.type,
      content: input.content,
      metadata: input.metadata ?? null,
      aiGenerated: input.aiGenerated ?? false,
      createdBy: input.createdBy ?? null,
    })
    .returning();

  await executor
    .update(leads)
    .set({ lastActivityAt: new Date() })
    .where(eq(leads.id, input.leadId));

  return entry;
}

export async function listTimeline(tenantId: string, leadId: string, query: ListTimelineQuery) {
  const offset = (query.page - 1) * query.limit;
  const filters = [eq(timelineEntries.tenantId, tenantId), eq(timelineEntries.leadId, leadId)];
  if (query.type) filters.push(eq(timelineEntries.type, query.type));
  const where = and(...filters);

  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(timelineEntries)
      .where(where)
      .orderBy(desc(timelineEntries.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(timelineEntries).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}

export async function getFullTimeline(tenantId: string, leadId: string, limit = 200) {
  return db
    .select()
    .from(timelineEntries)
    .where(and(eq(timelineEntries.tenantId, tenantId), eq(timelineEntries.leadId, leadId)))
    .orderBy(asc(timelineEntries.createdAt))
    .limit(limit);
}
