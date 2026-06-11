import type { FastifyInstance } from 'fastify';
import { createPipelineSchema, updatePipelineSchema } from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import {
  createPipeline,
  deletePipeline,
  listPipelines,
  updatePipeline,
} from './pipelines.service.js';

export async function pipelinesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const result = await listPipelines(auth.tenantId);
    return sendOk(reply, { pipelines: result });
  });

  app.post('/', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createPipelineSchema, request.body);
    const pipeline = await createPipeline(auth.tenantId, input);
    return sendOk(reply, { pipeline }, 201);
  });

  app.patch('/:id', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updatePipelineSchema, request.body);
    const pipeline = await updatePipeline(auth.tenantId, id, input);
    return sendOk(reply, { pipeline });
  });

  app.delete('/:id', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await deletePipeline(auth.tenantId, id);
    return sendOk(reply, { deleted: true });
  });
}
