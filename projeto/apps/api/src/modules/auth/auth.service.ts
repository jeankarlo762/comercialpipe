import { and, eq, isNull } from 'drizzle-orm';
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import {
  passwordResetTokens,
  pipelineStages,
  refreshTokens,
  tenants,
  users,
} from '../../shared/database/schema.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors/app-error.js';
import { hashPassword, verifyPassword } from '../../shared/security/password.js';
import {
  generateApiKey,
  generateOpaqueToken,
  sha256Hex,
} from '../../shared/security/crypto.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { env } from '../../config/env.js';
import { DEFAULT_PIPELINE_STAGES } from '../pipeline/default-stages.js';

export interface RegisterResult {
  tenant: { id: string; slug: string; name: string };
  user: AuthUser;
}

export async function registerTenant(input: RegisterInput): Promise<RegisterResult> {
  const existingSlug = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, input.slug))
    .limit(1);
  if (existingSlug.length > 0) {
    throw new ConflictError('Slug já está em uso', 'TENANT_SLUG_TAKEN');
  }

  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const [tenant] = await tx
      .insert(tenants)
      .values({
        name: input.tenantName,
        slug: input.slug,
        status: 'trial',
        apiKey: generateApiKey(),
      })
      .returning();
    if (!tenant) throw new Error('Falha ao criar tenant');

    const [user] = await tx
      .insert(users)
      .values({
        tenantId: tenant.id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: 'admin',
      })
      .returning();
    if (!user) throw new Error('Falha ao criar usuário admin');

    await tx.insert(pipelineStages).values(
      DEFAULT_PIPELINE_STAGES.map((stage, index) => ({
        tenantId: tenant.id,
        name: stage.name,
        orderIndex: index,
        color: stage.color,
        isClosedWon: stage.isClosedWon,
        isClosedLost: stage.isClosedLost,
      })),
    );

    await recordAudit(tx, { tenantId: tenant.id, userId: user.id }, {
      action: 'tenant.created',
      entityType: 'tenant',
      entityId: tenant.id,
      newValue: { name: tenant.name, slug: tenant.slug },
    });

    return {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  });
}

export async function validateCredentials(input: LoginInput): Promise<AuthUser> {
  const rows = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      tenantSlug: tenants.slug,
      tenantStatus: tenants.status,
    })
    .from(users)
    .innerJoin(tenants, eq(users.tenantId, tenants.id))
    .where(eq(users.email, input.email));

  const candidate = input.slug
    ? rows.find((r) => r.tenantSlug === input.slug)
    : rows[0];

  if (!candidate) {
    throw new UnauthorizedError('Credenciais inválidas', 'INVALID_CREDENTIALS');
  }
  if (!candidate.isActive) {
    throw new UnauthorizedError('Usuário inativo', 'USER_INACTIVE');
  }
  if (candidate.tenantStatus === 'suspended') {
    throw new UnauthorizedError('Tenant suspenso', 'TENANT_SUSPENDED');
  }

  const ok = await verifyPassword(candidate.passwordHash, input.password);
  if (!ok) {
    throw new UnauthorizedError('Credenciais inválidas', 'INVALID_CREDENTIALS');
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, candidate.id));

  return {
    id: candidate.id,
    tenantId: candidate.tenantId,
    name: candidate.name,
    email: candidate.email,
    role: candidate.role,
    avatarUrl: candidate.avatarUrl,
  };
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: sha256Hex(raw),
    expiresAt,
  });
  return raw;
}

export async function rotateRefreshToken(rawToken: string): Promise<AuthUser> {
  const tokenHash = sha256Hex(rawToken);
  const [record] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
    .limit(1);

  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError('Refresh token inválido ou expirado', 'INVALID_REFRESH_TOKEN');
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, record.id));

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
    .where(eq(users.id, record.userId))
    .limit(1);

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Usuário inativo', 'USER_INACTIVE');
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = sha256Hex(rawToken);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function createPasswordReset(email: string, slug: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(tenants, eq(users.tenantId, tenants.id))
    .where(and(eq(users.email, email), eq(tenants.slug, slug)))
    .limit(1);

  if (!user) return null;

  const raw = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: sha256Hex(raw),
    expiresAt,
  });
  return raw;
}

export async function confirmPasswordReset(input: ResetPasswordInput): Promise<void> {
  const tokenHash = sha256Hex(input.token);
  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)))
    .limit(1);

  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new NotFoundError('Token de redefinição inválido ou expirado', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(input.password);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));
    await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, record.userId), isNull(refreshTokens.revokedAt)));
  });
}
