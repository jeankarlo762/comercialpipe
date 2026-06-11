import { and, asc, eq, inArray, max } from 'drizzle-orm';
import type { CreatePipelineInput, UpdatePipelineInput } from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { leads, pipelines, pipelineStages } from '../../shared/database/schema.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error.js';

export async function listPipelines(tenantId: string) {
  return db
    .select()
    .from(pipelines)
    .where(eq(pipelines.tenantId, tenantId))
    .orderBy(asc(pipelines.orderIndex));
}

export async function createPipeline(tenantId: string, input: CreatePipelineInput) {
  const [row] = await db
    .select({ value: max(pipelines.orderIndex) })
    .from(pipelines)
    .where(eq(pipelines.tenantId, tenantId));
  const orderIndex = (row?.value ?? -1) + 1;

  const [pipeline] = await db
    .insert(pipelines)
    .values({ tenantId, name: input.name, color: input.color, isDefault: false, orderIndex })
    .returning();
  return pipeline;
}

export async function updatePipeline(tenantId: string, id: string, input: UpdatePipelineInput) {
  const [pipeline] = await db
    .update(pipelines)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    })
    .where(and(eq(pipelines.id, id), eq(pipelines.tenantId, tenantId)))
    .returning();
  if (!pipeline) throw new NotFoundError('Pipeline não encontrado', 'PIPELINE_NOT_FOUND');
  return pipeline;
}

export async function deletePipeline(tenantId: string, id: string) {
  const [existing] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.id, id), eq(pipelines.tenantId, tenantId)));
  if (!existing) throw new NotFoundError('Pipeline não encontrado', 'PIPELINE_NOT_FOUND');
  if (existing.isDefault) {
    throw new BadRequestError('Não é possível excluir o pipeline padrão', 'CANNOT_DELETE_DEFAULT');
  }

  const stagesToDelete = await db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .where(and(eq(pipelineStages.tenantId, tenantId), eq(pipelineStages.pipelineId, id)));

  if (stagesToDelete.length > 0) {
    const [defaultPipeline] = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.isDefault, true)));

    const [fallbackStage] = await db
      .select({ id: pipelineStages.id })
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.tenantId, tenantId),
          defaultPipeline
            ? eq(pipelineStages.pipelineId, defaultPipeline.id)
            : eq(pipelineStages.tenantId, tenantId),
        ),
      )
      .orderBy(asc(pipelineStages.orderIndex))
      .limit(1);

    if (fallbackStage) {
      await db
        .update(leads)
        .set({ stageId: fallbackStage.id })
        .where(
          and(
            eq(leads.tenantId, tenantId),
            inArray(
              leads.stageId,
              stagesToDelete.map((s) => s.id),
            ),
          ),
        );
    }
  }

  await db.delete(pipelines).where(and(eq(pipelines.id, id), eq(pipelines.tenantId, tenantId)));
}

export async function ensureDefaultPipeline(tenantId: string) {
  const [existing] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.isDefault, true)));
  if (existing) return existing;

  const [created] = await db
    .insert(pipelines)
    .values({ tenantId, name: 'Pipeline Principal', color: '#6366f1', isDefault: true, orderIndex: 0 })
    .returning();
  return created!;
}
