import type { FastifyInstance } from 'fastify';
import {
  buildPaginationMeta,
  createFormSchema,
  formSubmissionSchema,
  paginationQuerySchema,
  updateFormSchema,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth, auditContext } from '../../shared/http/context.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { db } from '../../shared/database/client.js';
import {
  createForm,
  deleteForm,
  getPublicForm,
  listForms,
  submitPublicForm,
  updateForm,
} from './forms.service.js';

export async function formsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(paginationQuerySchema, request.query);
    const { rows, total } = await listForms(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.post('/', { preHandler: requirePermission('automations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createFormSchema, request.body);
    const form = await createForm(auth.tenantId, auth.id, input);
    await recordAudit(db, auditContext(request), {
      action: 'form.created',
      entityType: 'form',
      entityId: form?.id,
      newValue: { name: form?.name },
    });
    return sendOk(reply, { form }, 201);
  });

  app.patch('/:id', { preHandler: requirePermission('automations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updateFormSchema, request.body);
    const form = await updateForm(auth.tenantId, id, input);
    return sendOk(reply, { form });
  });

  app.delete('/:id', { preHandler: requirePermission('automations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await deleteForm(auth.tenantId, id);
    await recordAudit(db, auditContext(request), { action: 'form.deleted', entityType: 'form', entityId: id });
    return sendOk(reply, { deleted: true });
  });
}

// Public, unauthenticated routes (form rendering + submission).
export async function publicFormsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/:publicId', async (request, reply) => {
    const { publicId } = request.params as { publicId: string };
    const form = await getPublicForm(publicId);
    return sendOk(reply, { form });
  });

  app.post(
    '/:publicId/submit',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { publicId } = request.params as { publicId: string };
      const input = parseOrThrow(formSubmissionSchema, request.body);
      const result = await submitPublicForm(publicId, input);
      return sendOk(reply, result, 201);
    },
  );
}
