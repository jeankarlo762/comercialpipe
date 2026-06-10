import { and, count, desc, eq } from 'drizzle-orm';
import type {
  CreateFormInput,
  FormField,
  FormSubmissionInput,
  PaginationQuery,
  UpdateFormInput,
} from '@commercialpipe/shared-types';
import { formFieldSchema } from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { accounts, contacts, forms, leads } from '../../shared/database/schema.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error.js';
import { generatePublicId } from '../../shared/security/crypto.js';
import { getFirstStageId } from '../pipeline/pipeline.service.js';
import { addTimelineEntry } from '../timeline/timeline.service.js';
import { enqueuePostCreate } from '../leads/leads.service.js';

export async function listForms(tenantId: string, query: PaginationQuery) {
  const offset = (query.page - 1) * query.limit;
  const where = eq(forms.tenantId, tenantId);
  const [rows, [totals]] = await Promise.all([
    db.select().from(forms).where(where).orderBy(desc(forms.createdAt)).limit(query.limit).offset(offset),
    db.select({ value: count() }).from(forms).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}

export async function createForm(tenantId: string, createdBy: string, input: CreateFormInput) {
  const [form] = await db
    .insert(forms)
    .values({
      tenantId,
      createdBy,
      name: input.name,
      description: input.description ?? null,
      fields: input.fields,
      isActive: input.isActive,
      publicId: generatePublicId(),
    })
    .returning();
  return form;
}

export async function updateForm(tenantId: string, id: string, input: UpdateFormInput) {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.fields !== undefined) patch.fields = input.fields;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [form] = await db
    .update(forms)
    .set(patch)
    .where(and(eq(forms.id, id), eq(forms.tenantId, tenantId)))
    .returning();
  if (!form) throw new NotFoundError('Formulário não encontrado', 'FORM_NOT_FOUND');
  return form;
}

export async function deleteForm(tenantId: string, id: string) {
  const [deleted] = await db
    .delete(forms)
    .where(and(eq(forms.id, id), eq(forms.tenantId, tenantId)))
    .returning({ id: forms.id });
  if (!deleted) throw new NotFoundError('Formulário não encontrado', 'FORM_NOT_FOUND');
}

export async function getPublicForm(publicId: string) {
  const [form] = await db
    .select({
      name: forms.name,
      description: forms.description,
      fields: forms.fields,
      isActive: forms.isActive,
      publicId: forms.publicId,
    })
    .from(forms)
    .where(eq(forms.publicId, publicId))
    .limit(1);
  if (!form || !form.isActive) throw new NotFoundError('Formulário indisponível', 'FORM_NOT_FOUND');
  return form;
}

export async function submitPublicForm(publicId: string, input: FormSubmissionInput) {
  const [form] = await db.select().from(forms).where(eq(forms.publicId, publicId)).limit(1);
  if (!form || !form.isActive) throw new NotFoundError('Formulário indisponível', 'FORM_NOT_FOUND');

  const tenantId = form.tenantId;
  const definedFields = (form.fields as unknown[]).map((f) => formFieldSchema.parse(f));

  // Valida campos obrigatórios definidos pelo formulário.
  const customFields: Record<string, unknown> = {};
  for (const field of definedFields) {
    const value = input.fields[field.key];
    const isEmpty =
      value === undefined ||
      value === '' ||
      value === false ||
      (Array.isArray(value) && value.length === 0);
    if (field.required && isEmpty) {
      throw new BadRequestError(`Campo obrigatório ausente: ${field.label}`, 'FORM_FIELD_REQUIRED');
    }
    if (value !== undefined) {
      // Armazena pelo rótulo do campo para exibir de forma legível no card/lead.
      if (field.options && field.options.length > 0 && Array.isArray(value)) {
        customFields[field.label] = value.filter((v) => field.options?.includes(v));
      } else {
        customFields[field.label] = value;
      }
    }
  }

  const stageId = await getFirstStageId(tenantId);

  const result = await db.transaction(async (tx) => {
    const [account] = await tx
      .insert(accounts)
      .values({ tenantId, name: input.company })
      .returning({ id: accounts.id });

    const [contact] = await tx
      .insert(contacts)
      .values({
        tenantId,
        accountId: account?.id ?? null,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone,
      })
      .returning({ id: contacts.id });

    const [lead] = await tx
      .insert(leads)
      .values({
        tenantId,
        title: `${input.name} — ${input.company}`,
        stageId,
        contactId: contact?.id ?? null,
        accountId: account?.id ?? null,
        currency: 'BRL',
        source: 'webhook',
        customFields,
      })
      .returning();
    if (!lead) throw new Error('Falha ao criar lead via formulário');

    await addTimelineEntry(
      {
        tenantId,
        leadId: lead.id,
        type: 'webhook',
        content: `Lead recebido via formulário "${form.name}"`,
        metadata: { source: 'form', formId: form.id, publicId },
        createdBy: null,
      },
      tx,
    );

    await tx
      .update(forms)
      .set({ submissionsCount: form.submissionsCount + 1 })
      .where(eq(forms.id, form.id));

    return { leadId: lead.id };
  });

  await enqueuePostCreate(tenantId, result.leadId, 'webhook');
  return { ok: true };
}

export type { FormField };
