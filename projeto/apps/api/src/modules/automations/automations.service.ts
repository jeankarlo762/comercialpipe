import { and, count, desc, eq } from 'drizzle-orm';
import type {
  CreateAutomationInput,
  PaginationQuery,
  UpdateAutomationInput,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { automationExecutions, automations } from '../../shared/database/schema.js';
import { NotFoundError } from '../../shared/errors/app-error.js';

export async function listAutomations(tenantId: string, query: PaginationQuery) {
  const offset = (query.page - 1) * query.limit;
  const where = eq(automations.tenantId, tenantId);
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(automations)
      .where(where)
      .orderBy(desc(automations.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(automations).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}

export async function getAutomation(tenantId: string, id: string) {
  const [automation] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)))
    .limit(1);
  if (!automation) throw new NotFoundError('Automação não encontrada', 'AUTOMATION_NOT_FOUND');
  return automation;
}

export async function createAutomation(
  tenantId: string,
  createdBy: string,
  input: CreateAutomationInput,
) {
  const [automation] = await db
    .insert(automations)
    .values({
      tenantId,
      createdBy,
      name: input.name,
      description: input.description ?? null,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig,
      conditions: input.conditions,
      actions: input.actions,
      isActive: input.isActive,
    })
    .returning();
  return automation;
}

export async function updateAutomation(
  tenantId: string,
  id: string,
  input: UpdateAutomationInput,
) {
  const patch: Record<string, unknown> = {};
  for (const key of [
    'name',
    'description',
    'triggerType',
    'triggerConfig',
    'conditions',
    'actions',
    'isActive',
  ] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  const [automation] = await db
    .update(automations)
    .set(patch)
    .where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)))
    .returning();
  if (!automation) throw new NotFoundError('Automação não encontrada', 'AUTOMATION_NOT_FOUND');
  return automation;
}

export async function deleteAutomation(tenantId: string, id: string) {
  const [deleted] = await db
    .delete(automations)
    .where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)))
    .returning({ id: automations.id });
  if (!deleted) throw new NotFoundError('Automação não encontrada', 'AUTOMATION_NOT_FOUND');
}

export async function toggleAutomation(tenantId: string, id: string) {
  const automation = await getAutomation(tenantId, id);
  const [updated] = await db
    .update(automations)
    .set({ isActive: !automation.isActive })
    .where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function listExecutions(tenantId: string, automationId: string, query: PaginationQuery) {
  const offset = (query.page - 1) * query.limit;
  const where = and(
    eq(automationExecutions.tenantId, tenantId),
    eq(automationExecutions.automationId, automationId),
  );
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(automationExecutions)
      .where(where)
      .orderBy(desc(automationExecutions.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(automationExecutions).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}
