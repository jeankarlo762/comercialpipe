import { and, count, desc, eq, ilike, type SQL } from 'drizzle-orm';
import type { CreateMessageTemplateInput, ListMessageTemplatesQuery, UpdateMessageTemplateInput } from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { messageTemplates } from '../../shared/database/schema.js';
import { NotFoundError } from '../../shared/errors/app-error.js';

export async function listMessageTemplates(tenantId: string, query: ListMessageTemplatesQuery) {
  const offset = (query.page - 1) * query.limit;
  const filters: SQL[] = [eq(messageTemplates.tenantId, tenantId)];
  if (query.category) filters.push(eq(messageTemplates.category, query.category));
  if (query.search) filters.push(ilike(messageTemplates.name, `%${query.search}%`));
  const where = and(...filters);

  const [rows, [totals]] = await Promise.all([
    db.select().from(messageTemplates).where(where).orderBy(desc(messageTemplates.createdAt)).limit(query.limit).offset(offset),
    db.select({ value: count() }).from(messageTemplates).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}

export async function createMessageTemplate(tenantId: string, createdBy: string, input: CreateMessageTemplateInput) {
  const [tpl] = await db
    .insert(messageTemplates)
    .values({ tenantId, createdBy, name: input.name, category: input.category, body: input.body })
    .returning();
  return tpl!;
}

export async function updateMessageTemplate(tenantId: string, id: string, input: UpdateMessageTemplateInput) {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.category !== undefined) patch.category = input.category;
  if (input.body !== undefined) patch.body = input.body;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [tpl] = await db
    .update(messageTemplates)
    .set(patch)
    .where(and(eq(messageTemplates.id, id), eq(messageTemplates.tenantId, tenantId)))
    .returning();
  if (!tpl) throw new NotFoundError('Template não encontrado', 'TEMPLATE_NOT_FOUND');
  return tpl;
}

export async function deleteMessageTemplate(tenantId: string, id: string) {
  const [tpl] = await db
    .delete(messageTemplates)
    .where(and(eq(messageTemplates.id, id), eq(messageTemplates.tenantId, tenantId)))
    .returning();
  if (!tpl) throw new NotFoundError('Template não encontrado', 'TEMPLATE_NOT_FOUND');
  return tpl;
}
