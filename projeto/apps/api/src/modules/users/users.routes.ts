import type { FastifyInstance } from 'fastify';
import {
  buildPaginationMeta,
  createUserSchema,
  paginationQuerySchema,
  updateUserSchema,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth, auditContext } from '../../shared/http/context.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { db } from '../../shared/database/client.js';
import { createUser, deleteUser, listAssignableUsers, listUsers, updateUser } from './users.service.js';

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/assignable', async (request, reply) => {
    const auth = requireAuth(request);
    const users = await listAssignableUsers(auth.tenantId);
    return sendOk(reply, { users });
  });

  app.get('/', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(paginationQuerySchema, request.query);
    const { rows, total } = await listUsers(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.post('/', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createUserSchema, request.body);
    const user = await createUser(auth.tenantId, input);
    await recordAudit(db, auditContext(request), {
      action: 'user.created',
      entityType: 'user',
      entityId: user?.id,
      newValue: { email: user?.email, role: user?.role },
    });
    return sendOk(reply, { user }, 201);
  });

  app.patch('/:id', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updateUserSchema, request.body);
    const user = await updateUser(auth.tenantId, id, input);
    await recordAudit(db, auditContext(request), {
      action: 'user.updated',
      entityType: 'user',
      entityId: id,
      newValue: { ...input, password: input.password ? '[redacted]' : undefined } as Record<string, unknown>,
    });
    return sendOk(reply, { user });
  });

  app.delete('/:id', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await deleteUser(auth.tenantId, id, auth.id);
    await recordAudit(db, auditContext(request), {
      action: 'user.deleted',
      entityType: 'user',
      entityId: id,
      newValue: null,
    });
    return sendOk(reply, { deleted: true });
  });
}
