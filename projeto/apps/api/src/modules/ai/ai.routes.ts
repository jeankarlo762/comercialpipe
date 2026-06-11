import type { FastifyInstance } from 'fastify';
import {
  buildPaginationMeta,
  emailDraftRequestSchema,
  paginationQuerySchema,
} from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk, sendPaginated } from '../../shared/http/response.js';
import { requireAuth, auditContext } from '../../shared/http/context.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { db } from '../../shared/database/client.js';
import { getBalance, listUsage } from './credits.service.js';
import { emailDraft, nextBestAction, scoreLead, summarizeTimeline } from './ai.service.js';

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.post(
    '/leads/:id/score',
    { preHandler: requirePermission('ai:use'), config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const auth = requireAuth(request);
      const { id } = request.params as { id: string };
      const result = await scoreLead({ tenantId: auth.tenantId, userId: auth.id }, id);
      await recordAudit(db, auditContext(request), {
        action: 'ai.lead_scored',
        entityType: 'lead',
        entityId: id,
        newValue: { score: result.score },
      });
      return sendOk(reply, result);
    },
  );

  app.post(
    '/leads/:id/summary',
    { preHandler: requirePermission('ai:use'), config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const auth = requireAuth(request);
      const { id } = request.params as { id: string };
      const result = await summarizeTimeline({ tenantId: auth.tenantId, userId: auth.id }, id);
      return sendOk(reply, result);
    },
  );

  app.post(
    '/leads/:id/next-action',
    { preHandler: requirePermission('ai:use'), config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const auth = requireAuth(request);
      const { id } = request.params as { id: string };
      const force = (request.query as { refresh?: string }).refresh === 'true';
      const { result, cached } = await nextBestAction(
        { tenantId: auth.tenantId, userId: auth.id },
        id,
        force,
      );
      return sendOk(reply, { ...result, cached });
    },
  );

  app.post(
    '/leads/:id/email-draft',
    { preHandler: requirePermission('ai:use'), config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const auth = requireAuth(request);
      const { id } = request.params as { id: string };
      const input = parseOrThrow(emailDraftRequestSchema, request.body);
      const result = await emailDraft({ tenantId: auth.tenantId, userId: auth.id }, id, input);
      return sendOk(reply, result);
    },
  );

  app.get('/credits', async (request, reply) => {
    const auth = requireAuth(request);
    const balance = await getBalance(auth.tenantId);
    return sendOk(reply, balance);
  });

  app.get('/usage', async (request, reply) => {
    const auth = requireAuth(request);
    const query = parseOrThrow(paginationQuerySchema, request.query);
    const { rows, total } = await listUsage(auth.tenantId, query);
    return sendPaginated(reply, rows, buildPaginationMeta(query.page, query.limit, total));
  });
}
