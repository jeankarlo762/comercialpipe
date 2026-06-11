import type { FastifyInstance } from 'fastify';
import { buildPaginationMeta, listNotificationsQuerySchema } from '@commercialpipe/shared-types';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import { getUnreadCount, listNotifications, markAllRead, markRead } from './notifications.service.js';

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(listNotificationsQuerySchema, request.query);
    const { rows, total, unreadCount } = await listNotifications(auth.id, auth.tenantId, query);
    return sendPaginated(reply, rows, { ...buildPaginationMeta(query.page, query.limit, total), unreadCount } as never);
  });

  app.get('/unread-count', async (request, reply) => {
    const auth = requireAuth(request);
    const unreadCount = await getUnreadCount(auth.id, auth.tenantId);
    return sendOk(reply, { unreadCount });
  });

  app.post('/:id/read', async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await markRead(auth.id, auth.tenantId, id);
    return sendOk(reply, { ok: true });
  });

  app.post('/read-all', async (request, reply) => {
    const auth = requireAuth(request);
    await markAllRead(auth.id, auth.tenantId);
    return sendOk(reply, { ok: true });
  });
}
