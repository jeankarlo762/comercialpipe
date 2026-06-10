import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { sendOk } from '../../shared/http/response.js';
import { requireAuth } from '../../shared/http/context.js';
import { AppError } from '../../shared/errors/app-error.js';
import {
  buildAuthUrl,
  disconnect,
  getStatus,
  isGoogleConfigured,
  signState,
  verifyState,
} from './google.service.js';

export async function googleIntegrationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/callback', async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };
    const redirectBase = `${env.WEB_ORIGIN.split(',')[0]}/calendar`;
    if (error || !code || !state) {
      return reply.redirect(`${redirectBase}?google=error`);
    }
    try {
      const { tenantId } = verifyState(state);
      void tenantId;
      const { handleCallback } = await import('./google.service.js');
      await handleCallback(code, state);
      return reply.redirect(`${redirectBase}?google=connected`);
    } catch {
      return reply.redirect(`${redirectBase}?google=error`);
    }
  });

  app.register(async (secured) => {
    secured.addHook('preHandler', authenticate);

    secured.get('/status', async (request, reply) => {
      const auth = requireAuth(request);
      const configured = await isGoogleConfigured(auth.tenantId);
      if (!configured) {
        return sendOk(reply, { configured: false, connected: false, email: null });
      }
      const status = await getStatus(auth.id);
      return sendOk(reply, { configured: true, ...status });
    });

    secured.get('/connect', async (request, reply) => {
      const auth = requireAuth(request);
      const configured = await isGoogleConfigured(auth.tenantId);
      if (!configured) {
        throw new AppError(503, 'GOOGLE_NOT_CONFIGURED', 'Integração Google não configurada');
      }
      const state = signState({ userId: auth.id, tenantId: auth.tenantId });
      const url = await buildAuthUrl(auth.tenantId, state);
      return sendOk(reply, { url });
    });

    secured.post('/disconnect', async (request, reply) => {
      const auth = requireAuth(request);
      await disconnect(auth.id);
      return sendOk(reply, { disconnected: true });
    });
  });
}
