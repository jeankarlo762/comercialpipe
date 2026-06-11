import { and, count, desc, eq } from 'drizzle-orm';
import type {
  CreateUserInput,
  PaginationQuery,
  UpdateUserInput,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { users } from '../../shared/database/schema.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { hashPassword } from '../../shared/security/password.js';

const publicColumns = {
  id: users.id,
  tenantId: users.tenantId,
  name: users.name,
  email: users.email,
  role: users.role,
  avatarUrl: users.avatarUrl,
  isActive: users.isActive,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

export async function listUsers(tenantId: string, query: PaginationQuery) {
  const offset = (query.page - 1) * query.limit;
  const [rows, [totals]] = await Promise.all([
    db
      .select(publicColumns)
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(desc(users.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(users).where(eq(users.tenantId, tenantId)),
  ]);
  return { rows, total: totals?.value ?? 0 };
}

export async function listAssignableUsers(tenantId: string) {
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .orderBy(users.name);
}

export async function createUser(tenantId: string, input: CreateUserInput) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, input.email)))
    .limit(1);
  if (existing.length > 0) {
    throw new ConflictError('E-mail já cadastrado neste tenant', 'USER_EMAIL_TAKEN');
  }
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      tenantId,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    })
    .returning(publicColumns);
  return user;
}

export async function updateUser(tenantId: string, userId: string, input: UpdateUserInput) {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.role !== undefined) patch.role = input.role;
  if (input.isActive !== undefined) patch.isActive = input.isActive;
  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;

  if (input.email !== undefined) {
    const conflict = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.email, input.email)))
      .limit(1);
    if (conflict.length > 0 && conflict[0]?.id !== userId) {
      throw new ConflictError('E-mail já em uso', 'USER_EMAIL_TAKEN');
    }
    patch.email = input.email;
  }

  if (input.password !== undefined) {
    patch.passwordHash = await hashPassword(input.password);
  }

  const [user] = await db
    .update(users)
    .set(patch)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .returning(publicColumns);
  if (!user) {
    throw new NotFoundError('Usuário não encontrado', 'USER_NOT_FOUND');
  }
  return user;
}

export async function deleteUser(tenantId: string, userId: string, requesterId: string) {
  if (userId === requesterId) {
    throw new ConflictError('Você não pode excluir sua própria conta', 'SELF_DELETE');
  }
  const [deleted] = await db
    .delete(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .returning({ id: users.id });
  if (!deleted) {
    throw new NotFoundError('Usuário não encontrado', 'USER_NOT_FOUND');
  }
  return deleted;
}
