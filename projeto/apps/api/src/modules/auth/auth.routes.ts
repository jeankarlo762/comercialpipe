import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@commercialpipe/shared-types';
import { env } from '../../config/env.js';
import { parseOrThrow } from '../../shared/http/validate.js';
import { sendOk } from '../../shared/http/response.js';
import { UnauthorizedError } from '../../shared/errors/app-error.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { requireAuth } from '../../shared/http/context.js';
import { sendPasswordResetEmail } from '../../shared/email/email.service.js';
import {
  confirmPasswordReset,
  createPasswordReset,
  issueRefreshToken,
  registerTenant,
  revokeRefreshToken,
  rotateRefreshToken,
  validateCredentials,
} from './auth.service.js';

const REFRESH_COOKIE = 'cp_refresh';

function signAccessToken(
  app: FastifyInstance,
  user: { id: string; tenantId: string; role: 'admin' | 'manager' | 'closer' | 'sdr'; email: string },
): string {
  return app.jwt.sign(
    { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email },
    { expiresIn: env.JWT_ACCESS_TTL },
  );
}

function setRefreshCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN,
    path: '/v1/auth',
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60,
  });
}

function clearRefreshCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_COOKIE, { path: '/v1/auth', domain: env.COOKIE_DOMAIN });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', async (request, reply) => {
    const input = parseOrThrow(registerSchema, request.body);
    const result = await registerTenant(input);
    const accessToken = signAccessToken(app, {
      id: result.user.id,
      tenantId: result.user.tenantId,
      role: result.user.role,
      email: result.user.email,
    });
    const refreshToken = await issueRefreshToken(result.user.id);
    setRefreshCookie(reply, refreshToken);
    return sendOk(reply, { accessToken, user: result.user, tenant: result.tenant }, 201);
  });

  app.post('/login', async (request, reply) => {
    const input = parseOrThrow(loginSchema, request.body);
    const user = await validateCredentials(input);
    const accessToken = signAccessToken(app, user);
    const refreshToken = await issueRefreshToken(user.id);
    setRefreshCookie(reply, refreshToken);
    return sendOk(reply, { accessToken, user });
  });

  app.post('/refresh', async (request, reply) => {
    const raw = request.cookies[REFRESH_COOKIE];
    if (!raw) {
      throw new UnauthorizedError('Refresh token ausente', 'REFRESH_TOKEN_MISSING');
    }
    const user = await rotateRefreshToken(raw);
    const accessToken = signAccessToken(app, user);
    const refreshToken = await issueRefreshToken(user.id);
    setRefreshCookie(reply, refreshToken);
    return sendOk(reply, { accessToken, user });
  });

  app.post('/logout', async (request, reply) => {
    const raw = request.cookies[REFRESH_COOKIE];
    if (raw) {
      await revokeRefreshToken(raw);
    }
    clearRefreshCookie(reply);
    return sendOk(reply, { loggedOut: true });
  });

  app.post('/forgot-password', async (request, reply) => {
    const input = parseOrThrow(forgotPasswordSchema, request.body);
    const result = await createPasswordReset(input.email);
    const payload: { message: string; resetToken?: string } = {
      message: 'Se o e-mail existir, um link de redefinição será enviado.',
    };
    if (result) {
      await sendPasswordResetEmail(result.userEmail, result.token).catch((err) =>
        console.error('[email] failed to send reset email:', err),
      );
      if (env.NODE_ENV !== 'production') {
        payload.resetToken = result.token;
      }
    }
    return sendOk(reply, payload);
  });

  app.post('/reset-password', async (request, reply) => {
    const input = parseOrThrow(resetPasswordSchema, request.body);
    await confirmPasswordReset(input);
    return sendOk(reply, { message: 'Senha redefinida com sucesso' });
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = requireAuth(request);
    return sendOk(reply, { user });
  });
}
