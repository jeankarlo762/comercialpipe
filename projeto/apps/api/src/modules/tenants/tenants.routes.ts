import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { n8nConfigSchema } from '@commercialpipe/shared-types';
import { authenticate, requirePermission } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk } from '../../shared/http/response.js';
import { requireAuth, auditContext } from '../../shared/http/context.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { db } from '../../shared/database/client.js';
import { getTenant, updateGoogleCredentials, updateN8nConfig } from './tenants.service.js';

const googleConfigSchema = z.object({
  clientId: z.string().min(1).nullable(),
  clientSecret: z.string().min(1).nullable(),
});

export async function tenantsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/current', async (request, reply) => {
    const auth = requireAuth(request);
    const tenant = await getTenant(auth.tenantId);
    return sendOk(reply, { tenant });
  });

  app.patch(
    '/current/integrations/n8n',
    { preHandler: requirePermission('integrations:manage') },
    async (request, reply) => {
      const auth = requireAuth(request);
      const input = parseOrThrow(n8nConfigSchema, request.body);
      const tenant = await updateN8nConfig(auth.tenantId, input);
      await recordAudit(db, auditContext(request), {
        action: 'integration.n8n_updated',
        entityType: 'tenant',
        entityId: auth.tenantId,
        newValue: { n8nBaseUrl: input.n8nBaseUrl },
      });
      return sendOk(reply, { tenant });
    },
  );

  app.patch(
    '/current/integrations/google',
    { preHandler: requirePermission('integrations:manage') },
    async (request, reply) => {
      const auth = requireAuth(request);
      const input = parseOrThrow(googleConfigSchema, request.body);
      const tenant = await updateGoogleCredentials(auth.tenantId, input.clientId, input.clientSecret);
      await recordAudit(db, auditContext(request), {
        action: 'integration.google_updated',
        entityType: 'tenant',
        entityId: auth.tenantId,
        newValue: { configured: Boolean(input.clientId) },
      });
      return sendOk(reply, { tenant });
    },
  );
}
