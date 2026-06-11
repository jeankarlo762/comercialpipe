import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  buildPaginationMeta,
  createLeadSchema,
  createTimelineEntrySchema,
  listLeadsQuerySchema,
  listTimelineQuerySchema,
  moveStageSchema,
  quickCreateLeadSchema,
  updateLeadSchema,
  type AuthUser,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth, auditContext } from '../../shared/http/context.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { db } from '../../shared/database/client.js';
import {
  createLead,
  getLeadDetail,
  listLeads,
  moveLeadStage,
  quickCreateLead,
  softDeleteLead,
  updateLead,
} from './leads.service.js';
import {
  addTimelineEntry,
  listTimeline,
} from '../timeline/timeline.service.js';

function viewerOf(request: FastifyRequest) {
  const auth: AuthUser = requireAuth(request);
  return { tenantId: auth.tenantId, userId: auth.id, role: auth.role };
}

export async function leadsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const query = parseOrThrow(listLeadsQuerySchema, request.query);
    const { rows, total } = await listLeads(viewerOf(request), query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const detail = await getLeadDetail(viewerOf(request), id);
    return sendOk(reply, detail);
  });

  app.post('/', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const input = parseOrThrow(createLeadSchema, request.body);
    const lead = await createLead(viewerOf(request), input);
    await recordAudit(db, auditContext(request), {
      action: 'lead.created',
      entityType: 'lead',
      entityId: lead.id,
      newValue: { title: lead.title, stageId: lead.stageId },
    });
    return sendOk(reply, { lead }, 201);
  });

  // Criação rápida: nome / empresa / telefone (+ faturamento e descrição opcionais).
  app.post('/quick', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const input = parseOrThrow(quickCreateLeadSchema, request.body);
    const lead = await quickCreateLead(viewerOf(request), input);
    await recordAudit(db, auditContext(request), {
      action: 'lead.created',
      entityType: 'lead',
      entityId: lead.id,
      newValue: { title: lead.title },
    });
    return sendOk(reply, { lead }, 201);
  });

  // Importação em lote via CSV
  app.post('/import', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { leads: rows } = request.body as { leads: Array<{ name: string; company: string; phone: string; email?: string; revenue?: string; description?: string }> };
    if (!Array.isArray(rows)) return sendOk(reply, { imported: 0, errors: 0 });
    let imported = 0;
    let errors = 0;
    for (const row of rows) {
      if (!row.name?.trim() || !row.company?.trim() || !row.phone?.trim()) { errors++; continue; }
      try {
        await quickCreateLead(viewerOf(request), {
          name: row.name.trim(),
          company: row.company.trim(),
          phone: row.phone.trim(),
          email: row.email?.trim() || undefined,
          revenue: row.revenue ? Number(row.revenue) || undefined : undefined,
          description: row.description?.trim() || undefined,
        });
        imported++;
      } catch { errors++; }
    }
    return sendOk(reply, { imported, errors });
  });

  app.patch('/:id', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = parseOrThrow(updateLeadSchema, request.body);
    const { previous, updated } = await updateLead(viewerOf(request), id, input);

    if (input.estimatedValue !== undefined && previous.estimatedValue !== updated.estimatedValue) {
      await recordAudit(db, auditContext(request), {
        action: 'lead.value_changed',
        entityType: 'lead',
        entityId: id,
        oldValue: { estimatedValue: previous.estimatedValue },
        newValue: { estimatedValue: updated.estimatedValue },
      });
    }
    if (input.ownerId !== undefined && previous.ownerId !== updated.ownerId) {
      await recordAudit(db, auditContext(request), {
        action: 'lead.owner_changed',
        entityType: 'lead',
        entityId: id,
        oldValue: { ownerId: previous.ownerId },
        newValue: { ownerId: updated.ownerId },
      });
    }
    await recordAudit(db, auditContext(request), {
      action: 'lead.updated',
      entityType: 'lead',
      entityId: id,
      newValue: input as Record<string, unknown>,
    });
    return sendOk(reply, { lead: updated });
  });

  app.patch('/:id/stage', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = parseOrThrow(moveStageSchema, request.body);
    const result = await moveLeadStage(viewerOf(request), id, input.stageId, input.lostReason);
    await recordAudit(db, auditContext(request), {
      action: 'lead.stage_changed',
      entityType: 'lead',
      entityId: id,
      oldValue: { stage: result.fromStage.name },
      newValue: { stage: result.toStage.name, status: result.lead.status },
    });
    return sendOk(reply, { lead: result.lead });
  });

  app.delete('/:id', { preHandler: requirePermission('leads:delete') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await softDeleteLead(viewerOf(request), id);
    await recordAudit(db, auditContext(request), {
      action: 'lead.deleted',
      entityType: 'lead',
      entityId: id,
      oldValue: { title: lead.title, status: lead.status },
    });
    return sendOk(reply, { deleted: true });
  });

  app.get('/:id/timeline', async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await getLeadDetail(viewerOf(request), id);
    const query = parseOrThrow(listTimelineQuerySchema, request.query);
    const { rows, total } = await listTimeline(auth.tenantId, id, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });

  app.post('/:id/timeline', { preHandler: requirePermission('leads:write') }, async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await getLeadDetail(viewerOf(request), id);
    const input = parseOrThrow(createTimelineEntrySchema, request.body);
    const entry = await addTimelineEntry({
      tenantId: auth.tenantId,
      leadId: id,
      type: input.type,
      content: input.content,
      metadata: input.metadata ?? null,
      createdBy: auth.id,
    });
    return sendOk(reply, { entry }, 201);
  });
}
