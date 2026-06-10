import type { FastifyInstance } from 'fastify';
import { listGoalsQuerySchema, upsertGoalSchema } from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import { listGoalsWithProgress, upsertGoal } from './user-goals.service.js';

export async function userGoalsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: requirePermission('reports:read') }, async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(listGoalsQuerySchema, request.query);
    const data = await listGoalsWithProgress(auth.tenantId, query);
    return sendOk(reply, { goals: data });
  });

  app.put('/', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(upsertGoalSchema, request.body);
    const goal = await upsertGoal(auth.tenantId, auth.id, input);
    return sendOk(reply, { goal });
  });
}
