import type { FastifyRequest } from 'fastify';
import type { AuthUser } from '@commercialpipe/shared-types';
import { UnauthorizedError } from '../errors/app-error.js';
import type { AuditContext } from '../audit/audit.service.js';

export function requireAuth(request: FastifyRequest): AuthUser {
  if (!request.auth) {
    throw new UnauthorizedError();
  }
  return request.auth;
}

export function auditContext(request: FastifyRequest): AuditContext {
  const auth = requireAuth(request);
  return {
    tenantId: auth.tenantId,
    userId: auth.id,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  };
}
