import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPaginationMeta, paginationQuerySchema } from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendPaginated } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import { listAuditLogs } from '../../shared/audit/audit.service.js';

const auditQuerySchema = paginationQuerySchema.extend({ action: z.string().max(80).optional() });

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(auditQuerySchema, request.query);
    const { rows, total } = await listAuditLogs(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });
}
