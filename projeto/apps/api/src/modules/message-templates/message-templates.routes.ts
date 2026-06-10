import type { FastifyInstance } from 'fastify';
import {
  buildPaginationMeta,
  createMessageTemplateSchema,
  listMessageTemplatesQuerySchema,
  updateMessageTemplateSchema,
} from '@commercialpipe/shared-types';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import {
  createMessageTemplate,
  deleteMessageTemplate,
  listMessageTemplates,
  updateMessageTemplate,
} from './message-templates.service.js';

export async function messageTemplatesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(listMessageTemplatesQuerySchema, request.query);
    const { rows, total } = await listMessageTemplates(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.post('/', async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createMessageTemplateSchema, request.body);
    const template = await createMessageTemplate(auth.tenantId, auth.id, input);
    return sendOk(reply, { template }, 201);
  });

  app.patch('/:id', async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updateMessageTemplateSchema, request.body);
    const template = await updateMessageTemplate(auth.tenantId, id, input);
    return sendOk(reply, { template });
  });

  app.delete('/:id', async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await deleteMessageTemplate(auth.tenantId, id);
    return sendOk(reply, { deleted: true });
  });
}
