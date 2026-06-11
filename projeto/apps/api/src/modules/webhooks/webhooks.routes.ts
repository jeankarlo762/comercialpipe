import type { FastifyInstance } from 'fastify';
import { inboundLeadSchema, n8nCallbackSchema } from '@commercialpipe/shared-types';
import { authenticateApiKey } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk } from '../../shared/http/response.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/app-error.js';
import { hmacVerify } from '../../shared/security/crypto.js';
import { getWebhookSecret } from '../tenants/tenants.service.js';
import { ingestLead, processN8nCallback, getN8nSignatureTenant } from './webhooks.service.js';

export async function webhooksRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/leads',
    {
      preHandler: authenticateApiKey,
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const tenantId = request.apiKeyTenantId;
      if (!tenantId) throw new UnauthorizedError('Tenant não identificado', 'API_KEY_INVALID');
      const input = parseOrThrow(inboundLeadSchema, request.body);
      const result = await ingestLead(tenantId, input);
      return sendOk(reply, result, 201);
    },
  );

  app.post(
    '/n8n/callback',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const signature = request.headers['x-n8n-signature'];
      if (typeof signature !== 'string') {
        throw new UnauthorizedError('Assinatura ausente', 'N8N_SIGNATURE_MISSING');
      }
      const input = parseOrThrow(n8nCallbackSchema, request.body);

      const tenantId = await getN8nSignatureTenant(input);
      if (!tenantId) throw new BadRequestError('Lead inexistente', 'LEAD_NOT_FOUND');

      const secret = await getWebhookSecret(tenantId);
      if (!secret) {
        throw new UnauthorizedError('n8n não configurado para este tenant', 'N8N_NOT_CONFIGURED');
      }

      const rawBody = request.rawBody ?? JSON.stringify(request.body);
      if (!hmacVerify(rawBody, secret, signature)) {
        throw new UnauthorizedError('Assinatura HMAC inválida', 'N8N_SIGNATURE_INVALID');
      }

      const result = await processN8nCallback(input);
      return sendOk(reply, { processed: true, tenantId: result.tenantId });
    },
  );
}
