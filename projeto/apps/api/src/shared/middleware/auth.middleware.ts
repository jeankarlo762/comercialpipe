import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import {
  type Permission,
  roleHasPermission,
} from '@commercialpipe/shared-types';
import { db } from '../database/client.js';
import { tenants, users } from '../database/schema.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('Token de acesso inválido ou expirado');
  }

  const payload = request.user;
  const [user] = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user || !user.isActive || user.tenantId !== payload.tenantId) {
    throw new UnauthorizedError('Usuário inativo ou inexistente');
  }

  request.auth = {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

export function requirePermission(permission: Permission) {
  return async function permissionGuard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.auth) {
      throw new UnauthorizedError();
    }
    if (!roleHasPermission(request.auth.role, permission)) {
      throw new ForbiddenError(`Permissão "${permission}" requerida`);
    }
  };
}

export async function authenticateApiKey(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const apiKey = request.headers['x-api-key'];
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new UnauthorizedError('X-API-Key ausente', 'API_KEY_MISSING');
  }
  const [tenant] = await db
    .select({ id: tenants.id, status: tenants.status })
    .from(tenants)
    .where(eq(tenants.apiKey, apiKey))
    .limit(1);

  if (!tenant) {
    throw new UnauthorizedError('API Key inválida', 'API_KEY_INVALID');
  }
  if (tenant.status === 'suspended') {
    throw new ForbiddenError('Tenant suspenso', 'TENANT_SUSPENDED');
  }
  request.apiKeyTenantId = tenant.id;
}
