import type { FastifyInstance } from 'fastify';
import {
  buildPaginationMeta,
  createMeetingSchema,
  listMeetingsQuerySchema,
  updateMeetingSchema,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import { createMeeting, deleteMeeting, listMeetings, updateMeeting } from './meetings.service.js';

export async function meetingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(listMeetingsQuerySchema, request.query);
    const { rows, total } = await listMeetings(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.post('/', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createMeetingSchema, request.body);
    const meeting = await createMeeting(auth.tenantId, auth.id, input);
    return sendOk(reply, { meeting }, 201);
  });

  app.patch('/:id', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updateMeetingSchema, request.body);
    const meeting = await updateMeeting(auth.tenantId, id, input);
    return sendOk(reply, { meeting });
  });

  app.delete('/:id', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await deleteMeeting(auth.tenantId, id);
    return sendOk(reply, { deleted: true });
  });
}
