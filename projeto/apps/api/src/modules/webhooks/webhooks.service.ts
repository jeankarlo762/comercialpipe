import { and, eq, isNull } from 'drizzle-orm';
import type { InboundLeadInput, N8nCallbackInput } from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { accounts, contacts, leads } from '../../shared/database/schema.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { getFirstStageId } from '../pipeline/pipeline.service.js';
import { addTimelineEntry } from '../timeline/timeline.service.js';
import { createTask } from '../tasks/tasks.service.js';
import { enqueuePostCreate } from '../leads/leads.service.js';

export interface IngestResult {
  leadId: string;
  contactId: string | null;
  accountId: string | null;
}

export async function ingestLead(tenantId: string, input: InboundLeadInput): Promise<IngestResult> {
  const stageId = await getFirstStageId(tenantId);

  const result = await db.transaction(async (tx) => {
    let accountId: string | null = null;
    if (input.account) {
      const [account] = await tx
        .insert(accounts)
        .values({
          tenantId,
          name: input.account.name,
          domain: input.account.domain ?? null,
          website: input.account.website ?? null,
        })
        .returning({ id: accounts.id });
      accountId = account?.id ?? null;
    }

    let contactId: string | null = null;
    if (input.contact) {
      const [contact] = await tx
        .insert(contacts)
        .values({
          tenantId,
          accountId,
          name: input.contact.name,
          email: input.contact.email ?? null,
          phone: input.contact.phone ?? null,
          roleTitle: input.contact.roleTitle ?? null,
        })
        .returning({ id: contacts.id });
      contactId = contact?.id ?? null;
    }

    const title = input.title ?? input.account?.name ?? input.contact?.name ?? 'Novo lead';
    const [lead] = await tx
      .insert(leads)
      .values({
        tenantId,
        title,
        stageId,
        contactId,
        accountId,
        estimatedValue: input.estimatedValue !== undefined ? input.estimatedValue.toFixed(2) : null,
        currency: input.currency ?? 'BRL',
        source: 'webhook',
        utmData: input.utm ?? null,
        customFields: input.customFields ?? {},
      })
      .returning();
    if (!lead) throw new Error('Falha ao criar lead via webhook');

    await addTimelineEntry(
      {
        tenantId,
        leadId: lead.id,
        type: 'webhook',
        content: 'Lead recebido via webhook externo',
        metadata: { source: 'webhook', utm: input.utm ?? null },
        createdBy: null,
      },
      tx,
    );

    return { leadId: lead.id, contactId, accountId };
  });

  await enqueuePostCreate(tenantId, result.leadId, 'webhook');
  return result;
}

export async function processN8nCallback(input: N8nCallbackInput): Promise<{ tenantId: string }> {
  const [lead] = await db
    .select({ id: leads.id, tenantId: leads.tenantId })
    .from(leads)
    .where(and(eq(leads.id, input.leadId), isNull(leads.deletedAt)))
    .limit(1);
  if (!lead) throw new NotFoundError('Lead do callback não encontrado', 'LEAD_NOT_FOUND');

  const tenantId = lead.tenantId;

  for (const action of input.actions) {
    try {
      if (action.type === 'add_timeline_note') {
        await addTimelineEntry({
          tenantId,
          leadId: lead.id,
          type: 'webhook',
          content: action.content ?? 'Ação registrada via n8n',
          metadata: { source: 'n8n', executionId: input.executionId },
          createdBy: null,
        });
      } else if (action.type === 'create_task') {
        await createTask(tenantId, lead.id, {
          leadId: lead.id,
          title: action.title ?? 'Tarefa criada via n8n',
          description: action.content ?? null,
        });
      }
    } catch {
      // Rule 12 analogue: isolate callback action failures.
    }
  }

  await addTimelineEntry({
    tenantId,
    leadId: lead.id,
    type: 'system',
    content: `Callback do n8n recebido (execução ${input.executionId}) — status: ${input.status}`,
    metadata: { executionId: input.executionId, status: input.status, error: input.errorMessage ?? null },
    createdBy: null,
  });

  return { tenantId };
}

export function getN8nSignatureTenant(input: N8nCallbackInput): Promise<string | null> {
  return db
    .select({ tenantId: leads.tenantId })
    .from(leads)
    .where(eq(leads.id, input.leadId))
    .limit(1)
    .then((rows) => rows[0]?.tenantId ?? null);
}
