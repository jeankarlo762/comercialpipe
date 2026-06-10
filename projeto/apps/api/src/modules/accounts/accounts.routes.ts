import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  buildPaginationMeta,
  createAccountSchema,
  paginationQuerySchema,
  updateAccountSchema,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth, auditContext } from '../../shared/http/context.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { db } from '../../shared/database/client.js';
import { createAccount, listAccounts, updateAccount } from './accounts.service.js';

const listQuerySchema = paginationQuerySchema.extend({ search: z.string().max(200).optional() });

export async function accountsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(listQuerySchema, request.query);
    const { rows, total } = await listAccounts(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.post('/', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createAccountSchema, request.body);
    const account = await createAccount(auth.tenantId, auth.id, input);
    await recordAudit(db, auditContext(request), {
      action: 'account.created',
      entityType: 'account',
      entityId: account?.id,
      newValue: { name: account?.name },
    });
    return sendOk(reply, { account }, 201);
  });

  app.patch('/:id', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updateAccountSchema, request.body);
    const account = await updateAccount(auth.tenantId, id, input);
    await recordAudit(db, auditContext(request), {
      action: 'account.updated',
      entityType: 'account',
      entityId: id,
      newValue: input as Record<string, unknown>,
    });
    return sendOk(reply, { account });
  });
}
