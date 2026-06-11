import { and, asc, count, eq, isNull, max, SQL, sql } from 'drizzle-orm';
import type {
  CreateStageInput,
  ReorderStagesInput,
  UpdateStageInput,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { leads, pipelineStages } from '../../shared/database/schema.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

export async function listStages(tenantId: string, pipelineId?: string) {
  const conditions: SQL[] = [eq(pipelineStages.tenantId, tenantId)];
  if (pipelineId) conditions.push(eq(pipelineStages.pipelineId, pipelineId));
  return db
    .select()
    .from(pipelineStages)
    .where(and(...conditions))
    .orderBy(asc(pipelineStages.orderIndex));
}

export async function createStage(tenantId: string, input: CreateStageInput & { pipelineId?: string }) {
  let orderIndex = input.orderIndex;
  if (orderIndex === undefined) {
    const [row] = await db
      .select({ value: max(pipelineStages.orderIndex) })
      .from(pipelineStages)
      .where(eq(pipelineStages.tenantId, tenantId));
    orderIndex = (row?.value ?? -1) + 1;
  }
  const [stage] = await db
    .insert(pipelineStages)
    .values({
      tenantId,
      pipelineId: input.pipelineId ?? null,
      name: input.name,
      color: input.color,
      isClosedWon: input.isClosedWon,
      isClosedLost: input.isClosedLost,
      orderIndex,
    })
    .returning();
  return stage;
}

export async function updateStage(tenantId: string, stageId: string, input: UpdateStageInput) {
  const [stage] = await db
    .update(pipelineStages)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.isClosedWon !== undefined ? { isClosedWon: input.isClosedWon } : {}),
      ...(input.isClosedLost !== undefined ? { isClosedLost: input.isClosedLost } : {}),
      ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
    })
    .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)))
    .returning();
  if (!stage) throw new NotFoundError('Estágio não encontrado', 'STAGE_NOT_FOUND');
  return stage;
}

export async function reorderStages(tenantId: string, input: ReorderStagesInput) {
  await db.transaction(async (tx) => {
    for (const item of input.order) {
      await tx
        .update(pipelineStages)
        .set({ orderIndex: item.orderIndex })
        .where(and(eq(pipelineStages.id, item.id), eq(pipelineStages.tenantId, tenantId)));
    }
  });
  return listStages(tenantId);
}

export async function deleteStage(tenantId: string, stageId: string, moveToStageId: string) {
  if (stageId === moveToStageId) {
    throw new BadRequestError('O estágio de destino deve ser diferente', 'INVALID_MOVE_TARGET');
  }
  const stages = await db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .where(eq(pipelineStages.tenantId, tenantId));
  const ids = new Set(stages.map((s) => s.id));
  if (!ids.has(stageId)) throw new NotFoundError('Estágio não encontrado', 'STAGE_NOT_FOUND');
  if (!ids.has(moveToStageId)) {
    throw new BadRequestError('Estágio de destino inválido', 'INVALID_MOVE_TARGET');
  }

  await db.transaction(async (tx) => {
    await tx
      .update(leads)
      .set({ stageId: moveToStageId })
      .where(
        and(eq(leads.tenantId, tenantId), eq(leads.stageId, stageId), isNull(leads.deletedAt)),
      );
    await tx
      .delete(pipelineStages)
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)));
  });
}

export async function getBoard(tenantId: string, ownerScope: string | null, pipelineId?: string) {
  const stages = await listStages(tenantId, pipelineId);
  const ownerFilter = ownerScope ? sql`and ${leads.ownerId} = ${ownerScope}` : sql``;

  const aggregates = await db.execute(sql`
    select ${leads.stageId} as stage_id,
           count(*)::int as lead_count,
           coalesce(sum(${leads.estimatedValue}), 0)::text as total_value
    from ${leads}
    where ${leads.tenantId} = ${tenantId}
      and ${leads.deletedAt} is null
      and ${leads.status} = 'open'
      ${ownerFilter}
    group by ${leads.stageId}
  `);

  const byStage = new Map<string, { count: number; value: string }>();
  for (const row of aggregates as unknown as Array<{ stage_id: string; lead_count: number; total_value: string }>) {
    byStage.set(row.stage_id, { count: row.lead_count, value: row.total_value });
  }

  return stages.map((stage) => ({
    ...stage,
    leadCount: byStage.get(stage.id)?.count ?? 0,
    totalValue: byStage.get(stage.id)?.value ?? '0',
  }));
}

export async function assertStageBelongsToTenant(tenantId: string, stageId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(pipelineStages)
    .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)));
  if ((row?.value ?? 0) === 0) {
    throw new BadRequestError('Estágio inexistente neste tenant', 'INVALID_STAGE');
  }
}

export async function getFirstStageId(tenantId: string, pipelineId?: string): Promise<string> {
  const conditions: SQL[] = [eq(pipelineStages.tenantId, tenantId)];
  if (pipelineId) conditions.push(eq(pipelineStages.pipelineId, pipelineId));
  const [stage] = await db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .where(and(...conditions))
    .orderBy(asc(pipelineStages.orderIndex))
    .limit(1);
  if (!stage) throw new ConflictError('Nenhum estágio configurado', 'NO_STAGES');
  return stage.id;
}
