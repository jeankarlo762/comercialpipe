import type { FastifyInstance } from 'fastify';
import {
  buildPaginationMeta,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import { createTask, listTasks, updateTask } from './tasks.service.js';

export async function tasksRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(listTasksQuerySchema, request.query);
    const { rows, total } = await listTasks(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.post('/', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createTaskSchema, request.body);
    const task = await createTask(auth.tenantId, auth.id, input);
    return sendOk(reply, { task }, 201);
  });

  app.patch('/:id', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updateTaskSchema, request.body);
    const task = await updateTask(auth.tenantId, id, input);
    return sendOk(reply, { task });
  });
}
