import type { FastifyInstance } from 'fastify';
import {
  createStageSchema,
  deleteStageSchema,
  leadVisibilityScope,
  reorderStagesSchema,
  updateStageSchema,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk } from '../../shared/http/response.js';
import { requireAuth, auditContext } from '../../shared/http/context.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { db } from '../../shared/database/client.js';
import {
  createStage,
  deleteStage,
  getBoard,
  listStages,
  reorderStages,
  updateStage,
} from './pipeline.service.js';

export async function pipelineRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const { pipelineId } = request.query as { pipelineId?: string };
    const scope = leadVisibilityScope(auth.role) === 'own' ? auth.id : null;
    const board = await getBoard(auth.tenantId, scope, pipelineId);
    return sendOk(reply, { stages: board });
  });

  app.get('/stages', async (request, reply) => {
    const auth = requireAuth(request);
    const { pipelineId } = request.query as { pipelineId?: string };
    const stages = await listStages(auth.tenantId, pipelineId);
    return sendOk(reply, { stages });
  });

  app.post('/stages', { preHandler: requirePermission('pipeline:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createStageSchema, request.body);
    const stage = await createStage(auth.tenantId, input);
    await recordAudit(db, auditContext(request), {
      action: 'stage.created',
      entityType: 'pipeline_stage',
      entityId: stage?.id,
      newValue: { name: stage?.name },
    });
    return sendOk(reply, { stage }, 201);
  });

  app.patch(
    '/stages/reorder',
    { preHandler: requirePermission('pipeline:manage') },
    async (request, reply) => {
      const auth = requireAuth(request);
      const input = parseOrThrow(reorderStagesSchema, request.body);
      const stages = await reorderStages(auth.tenantId, input);
      return sendOk(reply, { stages });
    },
  );

  app.patch(
    '/stages/:id',
    { preHandler: requirePermission('pipeline:manage') },
    async (request, reply) => {
      const auth = requireAuth(request);
      const { id } = request.params as { id: string };
      const input = parseOrThrow(updateStageSchema, request.body);
      const stage = await updateStage(auth.tenantId, id, input);
      await recordAudit(db, auditContext(request), {
        action: 'stage.updated',
        entityType: 'pipeline_stage',
        entityId: id,
        newValue: input as Record<string, unknown>,
      });
      return sendOk(reply, { stage });
    },
  );

  app.delete(
    '/stages/:id',
    { preHandler: requirePermission('pipeline:manage') },
    async (request, reply) => {
      const auth = requireAuth(request);
      const { id } = request.params as { id: string };
      const input = parseOrThrow(deleteStageSchema, request.body);
      await deleteStage(auth.tenantId, id, input.moveToStageId);
      await recordAudit(db, auditContext(request), {
        action: 'stage.deleted',
        entityType: 'pipeline_stage',
        entityId: id,
        oldValue: { movedLeadsTo: input.moveToStageId },
      });
      return sendOk(reply, { deleted: true });
    },
  );
}
