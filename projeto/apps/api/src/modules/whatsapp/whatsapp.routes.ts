import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import { BadRequestError } from '../../shared/errors/app-error.js';
import { getWhatsappCredentials } from '../tenants/tenants.service.js';
import { sendWhatsappTextMessage } from './whatsapp.service.js';

const sendMessageSchema = z.object({
  to: z.string().min(5).max(20),
  body: z.string().min(1).max(4096),
});

export async function whatsappRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.post('/send', async (request, reply) => {
    const auth = requireAuth(request);
    const input = parseOrThrow(sendMessageSchema, request.body);
    const creds = await getWhatsappCredentials(auth.tenantId);
    if (!creds) throw new BadRequestError('WhatsApp não configurado', 'WHATSAPP_NOT_CONFIGURED');
    const result = await sendWhatsappTextMessage(input.to, input.body, creds);
    return sendOk(reply, result);
  });
}
