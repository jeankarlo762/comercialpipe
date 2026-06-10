import type { FastifyInstance } from 'fastify';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { sendOk } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import { getOverview } from './analytics.service.js';

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/overview', { preHandler: requirePermission('reports:read') }, async (request, reply) => {
    const auth = requireAuth(request);
    const overview = await getOverview(auth.tenantId);
    return sendOk(reply, overview);
  });
}
