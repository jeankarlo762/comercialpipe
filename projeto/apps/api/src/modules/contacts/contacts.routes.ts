import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  buildPaginationMeta,
  createContactSchema,
  paginationQuerySchema,
  updateContactSchema,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth, auditContext } from '../../shared/http/context.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { db } from '../../shared/database/client.js';
import { createContact, listContacts, updateContact } from './contacts.service.js';

const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(200).optional(),
  accountId: z.string().uuid().optional(),
});

export async function contactsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(listQuerySchema, request.query);
    const { rows, total } = await listContacts(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.post('/', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createContactSchema, request.body);
    const contact = await createContact(auth.tenantId, auth.id, input);
    await recordAudit(db, auditContext(request), {
      action: 'contact.created',
      entityType: 'contact',
      entityId: contact?.id,
      newValue: { name: contact?.name },
    });
    return sendOk(reply, { contact }, 201);
  });

  app.patch('/:id', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updateContactSchema, request.body);
    const contact = await updateContact(auth.tenantId, id, input);
    await recordAudit(db, auditContext(request), {
      action: 'contact.updated',
      entityType: 'contact',
      entityId: id,
      newValue: input as Record<string, unknown>,
    });
    return sendOk(reply, { contact });
  });
}
