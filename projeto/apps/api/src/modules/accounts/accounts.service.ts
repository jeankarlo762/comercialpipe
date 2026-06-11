import { and, count, desc, eq, ilike } from 'drizzle-orm';
import type {
  CreateAccountInput,
  PaginationQuery,
  UpdateAccountInput,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { accounts } from '../../shared/database/schema.js';
import { NotFoundError } from '../../shared/errors/app-error.js';

export async function listAccounts(
  tenantId: string,
  query: PaginationQuery & { search?: string },
) {
  const offset = (query.page - 1) * query.limit;
  const where = query.search
    ? and(eq(accounts.tenantId, tenantId), ilike(accounts.name, `%${query.search}%`))
    : eq(accounts.tenantId, tenantId);

  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(where)
      .orderBy(desc(accounts.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(accounts).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}

export async function createAccount(
  tenantId: string,
  createdBy: string,
  input: CreateAccountInput,
) {
  const [account] = await db
    .insert(accounts)
    .values({
      tenantId,
      createdBy,
      name: input.name,
      domain: input.domain ?? null,
      industry: input.industry ?? null,
      size: input.size ?? null,
      website: input.website ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      address: input.address ?? null,
      customFields: input.customFields ?? {},
    })
    .returning();
  return account;
}

export async function updateAccount(
  tenantId: string,
  accountId: string,
  input: UpdateAccountInput,
) {
  const [account] = await db
    .update(accounts)
    .set(input as Record<string, unknown>)
    .where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)))
    .returning();
  if (!account) throw new NotFoundError('Empresa não encontrada', 'ACCOUNT_NOT_FOUND');
  return account;
}
