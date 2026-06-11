import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import type {
  CreateContactInput,
  PaginationQuery,
  UpdateContactInput,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { contacts } from '../../shared/database/schema.js';
import { NotFoundError } from '../../shared/errors/app-error.js';

export async function listContacts(
  tenantId: string,
  query: PaginationQuery & { search?: string; accountId?: string },
) {
  const offset = (query.page - 1) * query.limit;
  const filters = [eq(contacts.tenantId, tenantId)];
  if (query.accountId) filters.push(eq(contacts.accountId, query.accountId));
  if (query.search) {
    const term = `%${query.search}%`;
    const searchFilter = or(ilike(contacts.name, term), ilike(contacts.email, term));
    if (searchFilter) filters.push(searchFilter);
  }
  const where = and(...filters);

  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(where)
      .orderBy(desc(contacts.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(contacts).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}

export async function createContact(
  tenantId: string,
  createdBy: string,
  input: CreateContactInput,
) {
  const [contact] = await db
    .insert(contacts)
    .values({
      tenantId,
      createdBy,
      accountId: input.accountId ?? null,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      roleTitle: input.roleTitle ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      customFields: input.customFields ?? {},
    })
    .returning();
  return contact;
}

export async function updateContact(
  tenantId: string,
  contactId: string,
  input: UpdateContactInput,
) {
  const [contact] = await db
    .update(contacts)
    .set(input as Record<string, unknown>)
    .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
    .returning();
  if (!contact) throw new NotFoundError('Contato não encontrado', 'CONTACT_NOT_FOUND');
  return contact;
}
