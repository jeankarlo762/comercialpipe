import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './shared/http/error-handler.js';
import { sendError } from './shared/http/response.js';
import { redis } from './shared/redis/connection.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { tenantsRoutes } from './modules/tenants/tenants.routes.js';
import { pipelineRoutes } from './modules/pipeline/pipeline.routes.js';
import { accountsRoutes } from './modules/accounts/accounts.routes.js';
import { contactsRoutes } from './modules/contacts/contacts.routes.js';
import { leadsRoutes } from './modules/leads/leads.routes.js';
import { tasksRoutes } from './modules/tasks/tasks.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { automationsRoutes } from './modules/automations/automations.routes.js';
import { webhooksRoutes } from './modules/webhooks/webhooks.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { formsRoutes, publicFormsRoutes } from './modules/forms/forms.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { meetingsRoutes } from './modules/meetings/meetings.routes.js';
import { googleIntegrationRoutes } from './modules/integrations/google.routes.js';
import { messageTemplatesRoutes } from './modules/message-templates/message-templates.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { userGoalsRoutes } from './modules/user-goals/user-goals.routes.js';
import { pipelinesRoutes } from './modules/pipelines/pipelines.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
    trustProxy: true,
    bodyLimit: 1_048_576,
  });

  // Capture the raw body so webhook HMAC validation can run on the exact bytes received.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    const raw = typeof body === 'string' ? body : body.toString('utf8');
    request.rawBody = raw;
    try {
      done(null, raw.length ? JSON.parse(raw) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.WEB_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request) => {
      const auth = request.headers.authorization;
      return auth ? `auth:${auth}` : `ip:${request.ip}`;
    },
  });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((request, reply) =>
    sendError(reply, 404, 'ROUTE_NOT_FOUND', `Rota ${request.method} ${request.url} não existe`),
  );

  app.get('/health', async () => ({ success: true, data: { status: 'ok', service: 'commercialpipe-api' } }));

  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(usersRoutes, { prefix: '/users' });
      await v1.register(tenantsRoutes, { prefix: '/tenants' });
      await v1.register(pipelineRoutes, { prefix: '/pipeline' });
      await v1.register(accountsRoutes, { prefix: '/accounts' });
      await v1.register(contactsRoutes, { prefix: '/contacts' });
      await v1.register(leadsRoutes, { prefix: '/leads' });
      await v1.register(tasksRoutes, { prefix: '/tasks' });
      await v1.register(aiRoutes, {
        prefix: '/ai',
        // Rule 4: stricter limit on AI endpoints (10 req/min).
      });
      await v1.register(automationsRoutes, { prefix: '/automations' });
      await v1.register(webhooksRoutes, { prefix: '/webhooks' });
      await v1.register(analyticsRoutes, { prefix: '/analytics' });
      await v1.register(formsRoutes, { prefix: '/forms' });
      await v1.register(publicFormsRoutes, { prefix: '/public/forms' });
      await v1.register(auditRoutes, { prefix: '/audit' });
      await v1.register(meetingsRoutes, { prefix: '/meetings' });
      await v1.register(googleIntegrationRoutes, { prefix: '/integrations/google' });
      await v1.register(messageTemplatesRoutes, { prefix: '/message-templates' });
      await v1.register(notificationsRoutes, { prefix: '/notifications' });
      await v1.register(userGoalsRoutes, { prefix: '/goals' });
      await v1.register(pipelinesRoutes, { prefix: '/pipelines' });
    },
    { prefix: '/v1' },
  );

  return app;
}
