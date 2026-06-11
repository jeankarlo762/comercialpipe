import type { FastifyInstance } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import {
  automationConditionSchema,
  buildPaginationMeta,
  createAutomationSchema,
  paginationQuerySchema,
  testAutomationSchema,
  updateAutomationSchema,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth, auditContext } from '../../shared/http/context.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { db } from '../../shared/database/client.js';
import { leads, type Lead } from '../../shared/database/schema.js';
import { getN8nCredentials } from '../tenants/tenants.service.js';
import {
  createAutomation,
  deleteAutomation,
  getAutomation,
  listAutomations,
  listExecutions,
  toggleAutomation,
  updateAutomation,
} from './automations.service.js';
import { evaluateConditions } from './automation.engine.js';
import { listWorkflows } from './n8n.client.js';

function syntheticLead(tenantId: string): Lead {
  const now = new Date();
  return {
    id: '00000000-0000-0000-0000-000000000000',
    tenantId,
    title: 'Lead de teste',
    ownerId: null,
    stageId: '00000000-0000-0000-0000-000000000000',
    contactId: null,
    accountId: null,
    estimatedValue: '10000.00',
    currency: 'BRL',
    probability: 50,
    status: 'open',
    lostReason: null,
    expectedCloseDate: null,
    aiScore: 'A',
    aiScoreReason: 'Lead de teste',
    lastActivityAt: now,
    source: 'manual',
    utmData: null,
    customFields: {},
    createdBy: null,
    deletedAt: null,
    createdAt: now,
  };
}

export async function automationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(paginationQuerySchema, request.query);
    const { rows, total } = await listAutomations(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.get('/n8n/workflows', { preHandler: requirePermission('integrations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const credentials = await getN8nCredentials(auth.tenantId);
    if (!credentials) return sendOk(reply, { workflows: [], configured: false });
    const workflows = await listWorkflows(credentials);
    return sendOk(reply, { workflows, configured: true });
  });

  app.post('/', { preHandler: requirePermission('automations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(createAutomationSchema, request.body);
    const automation = await createAutomation(auth.tenantId, auth.id, input);
    await recordAudit(db, auditContext(request), {
      action: 'automation.created',
      entityType: 'automation',
      entityId: automation?.id,
      newValue: { name: automation?.name, triggerType: automation?.triggerType },
    });
    return sendOk(reply, { automation }, 201);
  });

  app.patch('/:id', { preHandler: requirePermission('automations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updateAutomationSchema, request.body);
    const automation = await updateAutomation(auth.tenantId, id, input);
    await recordAudit(db, auditContext(request), {
      action: 'automation.updated',
      entityType: 'automation',
      entityId: id,
      newValue: input as Record<string, unknown>,
    });
    return sendOk(reply, { automation });
  });

  app.delete('/:id', { preHandler: requirePermission('automations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await deleteAutomation(auth.tenantId, id);
    await recordAudit(db, auditContext(request), {
      action: 'automation.deleted',
      entityType: 'automation',
      entityId: id,
    });
    return sendOk(reply, { deleted: true });
  });

  app.post('/:id/toggle', { preHandler: requirePermission('automations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const automation = await toggleAutomation(auth.tenantId, id);
    return sendOk(reply, { automation });
  });

  app.get('/:id/executions', { preHandler: requirePermission('automations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const query = parseOrThrow(paginationQuerySchema, request.query);
    const { rows, total } = await listExecutions(auth.tenantId, id, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.post('/:id/test', { preHandler: requirePermission('automations:manage') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    const input = parseOrThrow(testAutomationSchema, request.body);
    const automation = await getAutomation(auth.tenantId, id);

    let lead = syntheticLead(auth.tenantId);
    if (input.leadId) {
      const [found] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.tenantId, auth.tenantId), isNull(leads.deletedAt)))
        .limit(1);
      if (found) lead = found;
    }

    const conditions = (automation.conditions as unknown[]).map((c) =>
      automationConditionSchema.parse(c),
    );
    const wouldRun = evaluateConditions(conditions, lead);

    return sendOk(reply, {
      wouldRun,
      conditionsEvaluated: conditions.length,
      plannedActions: automation.actions,
      usingSyntheticLead: !input.leadId,
    });
  });
}
