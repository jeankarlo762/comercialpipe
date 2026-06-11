import { and, count, desc, eq, gte, ilike, isNull, lte, or, type SQL } from 'drizzle-orm';
import type {
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
  UserRole,
} from '@commercialpipe/shared-types';
import { leadVisibilityScope } from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import {
  accounts,
  contacts,
  leads,
  pipelineStages,
  users,
} from '../../shared/database/schema.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/app-error.js';
import { addTimelineEntry, getFullTimeline } from '../timeline/timeline.service.js';
import { assertStageBelongsToTenant, getFirstStageId } from '../pipeline/pipeline.service.js';
import { aiScoringQueue, automationQueue } from '../../shared/queue/queues.js';

interface Viewer {
  tenantId: string;
  userId: string;
  role: UserRole;
}

function scopeFilter(viewer: Viewer): SQL | undefined {
  return leadVisibilityScope(viewer.role) === 'own' ? eq(leads.ownerId, viewer.userId) : undefined;
}

function toDecimal(value: number | undefined): string | undefined {
  return value === undefined ? undefined : value.toFixed(2);
}

export async function listLeads(viewer: Viewer, query: ListLeadsQuery) {
  const offset = (query.page - 1) * query.limit;
  const filters: (SQL | undefined)[] = [
    eq(leads.tenantId, viewer.tenantId),
    isNull(leads.deletedAt),
    scopeFilter(viewer),
  ];
  if (query.stageId) filters.push(eq(leads.stageId, query.stageId));
  if (query.ownerId) filters.push(eq(leads.ownerId, query.ownerId));
  if (query.score) filters.push(eq(leads.aiScore, query.score));
  if (query.status) filters.push(eq(leads.status, query.status));
  if (query.search) filters.push(ilike(leads.title, `%${query.search}%`));
  if (query.createdFrom) filters.push(gte(leads.createdAt, new Date(query.createdFrom)));
  if (query.createdTo) filters.push(lte(leads.createdAt, new Date(query.createdTo)));

  const where = and(...filters.filter((f): f is SQL => f !== undefined));

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        lead: leads,
        ownerName: users.name,
        stageName: pipelineStages.name,
        stageColor: pipelineStages.color,
        contactName: contacts.name,
        contactPhone: contacts.phone,
        accountName: accounts.name,
      })
      .from(leads)
      .leftJoin(users, eq(leads.ownerId, users.id))
      .leftJoin(pipelineStages, eq(leads.stageId, pipelineStages.id))
      .leftJoin(contacts, eq(leads.contactId, contacts.id))
      .leftJoin(accounts, eq(leads.accountId, accounts.id))
      .where(where)
      .orderBy(desc(leads.lastActivityAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(leads).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r.lead,
      ownerName: r.ownerName,
      stageName: r.stageName,
      stageColor: r.stageColor,
      contactName: r.contactName,
      contactPhone: r.contactPhone,
      accountName: r.accountName,
    })),
    total: totals?.value ?? 0,
  };
}

async function findLeadForViewer(viewer: Viewer, leadId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, viewer.tenantId), isNull(leads.deletedAt)))
    .limit(1);
  if (!lead) throw new NotFoundError('Lead não encontrado', 'LEAD_NOT_FOUND');
  if (leadVisibilityScope(viewer.role) === 'own' && lead.ownerId !== viewer.userId) {
    throw new ForbiddenError('Sem acesso a este lead', 'LEAD_FORBIDDEN');
  }
  return lead;
}

export async function getLeadDetail(viewer: Viewer, leadId: string) {
  const lead = await findLeadForViewer(viewer, leadId);
  const [contact] = lead.contactId
    ? await db.select().from(contacts).where(eq(contacts.id, lead.contactId)).limit(1)
    : [null];
  const [account] = lead.accountId
    ? await db.select().from(accounts).where(eq(accounts.id, lead.accountId)).limit(1)
    : [null];
  const [stage] = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.id, lead.stageId))
    .limit(1);
  const timeline = await getFullTimeline(viewer.tenantId, leadId);

  return { lead, contact: contact ?? null, account: account ?? null, stage: stage ?? null, timeline };
}

export async function createLead(viewer: Viewer, input: CreateLeadInput) {
  const stageId = input.stageId ?? (await getFirstStageId(viewer.tenantId));
  if (input.stageId) await assertStageBelongsToTenant(viewer.tenantId, input.stageId);
  const ownerId = input.ownerId ?? viewer.userId;

  const lead = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(leads)
      .values({
        tenantId: viewer.tenantId,
        title: input.title,
        ownerId,
        stageId,
        contactId: input.contactId ?? null,
        accountId: input.accountId ?? null,
        estimatedValue: toDecimal(input.estimatedValue) ?? null,
        currency: input.currency,
        probability: input.probability ?? null,
        expectedCloseDate: input.expectedCloseDate ?? null,
        source: input.source,
        utmData: input.utmData ?? null,
        customFields: input.customFields ?? {},
        createdBy: viewer.userId,
      })
      .returning();
    if (!created) throw new Error('Falha ao criar lead');

    await addTimelineEntry(
      {
        tenantId: viewer.tenantId,
        leadId: created.id,
        type: 'system',
        content: `Lead criado por ${viewer.role}`,
        createdBy: viewer.userId,
      },
      tx,
    );
    return created;
  });

  await enqueuePostCreate(viewer.tenantId, lead.id, 'manual');
  return lead;
}

export async function quickCreateLead(
  viewer: Viewer,
  input: {
    name: string;
    company: string;
    phone: string;
    email?: string;
    revenue?: number;
    description?: string;
    stageId?: string;
    pipelineId?: string;
    ownerId?: string;
  },
) {
  const stageId = input.stageId ?? (await getFirstStageId(viewer.tenantId, input.pipelineId));
  if (input.stageId) await assertStageBelongsToTenant(viewer.tenantId, input.stageId);
  const ownerId = input.ownerId ?? viewer.userId;

  const lead = await db.transaction(async (tx) => {
    const [account] = await tx
      .insert(accounts)
      .values({ tenantId: viewer.tenantId, name: input.company, createdBy: viewer.userId })
      .returning({ id: accounts.id });

    const [contact] = await tx
      .insert(contacts)
      .values({
        tenantId: viewer.tenantId,
        accountId: account?.id ?? null,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        createdBy: viewer.userId,
      })
      .returning({ id: contacts.id });

    const [created] = await tx
      .insert(leads)
      .values({
        tenantId: viewer.tenantId,
        title: `${input.name} — ${input.company}`,
        ownerId,
        stageId,
        contactId: contact?.id ?? null,
        accountId: account?.id ?? null,
        estimatedValue: input.revenue !== undefined ? input.revenue.toFixed(2) : null,
        currency: 'BRL',
        source: 'manual',
        customFields: input.description ? { description: input.description } : {},
        createdBy: viewer.userId,
      })
      .returning();
    if (!created) throw new Error('Falha ao criar lead');

    await addTimelineEntry(
      {
        tenantId: viewer.tenantId,
        leadId: created.id,
        type: 'note',
        content: input.description
          ? `Lead criado. ${input.description}`
          : `Lead criado por ${viewer.role}`,
        createdBy: viewer.userId,
      },
      tx,
    );
    return created;
  });

  await enqueuePostCreate(viewer.tenantId, lead.id, 'manual');
  return lead;
}

export async function enqueuePostCreate(
  tenantId: string,
  leadId: string,
  triggeredBy: 'webhook' | 'manual' | 'automation',
) {
  await aiScoringQueue.add('score', { tenantId, leadId, triggeredBy });
  await automationQueue.add('new_lead', {
    tenantId,
    leadId,
    triggerType: 'new_lead',
    payload: { leadId },
  });
}

export async function updateLead(viewer: Viewer, leadId: string, input: UpdateLeadInput) {
  const current = await findLeadForViewer(viewer, leadId);

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.ownerId !== undefined) patch.ownerId = input.ownerId;
  if (input.contactId !== undefined) patch.contactId = input.contactId;
  if (input.accountId !== undefined) patch.accountId = input.accountId;
  if (input.estimatedValue !== undefined) patch.estimatedValue = toDecimal(input.estimatedValue);
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.probability !== undefined) patch.probability = input.probability;
  if (input.expectedCloseDate !== undefined) patch.expectedCloseDate = input.expectedCloseDate;
  if (input.customFields !== undefined) patch.customFields = input.customFields;

  const [updated] = await db
    .update(leads)
    .set(patch)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, viewer.tenantId)))
    .returning();

  return { previous: current, updated: updated! };
}

export async function softDeleteLead(viewer: Viewer, leadId: string) {
  const lead = await findLeadForViewer(viewer, leadId);
  await db
    .update(leads)
    .set({ deletedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, viewer.tenantId)));
  return lead;
}

export interface StageMoveResult {
  lead: typeof leads.$inferSelect;
  fromStage: typeof pipelineStages.$inferSelect;
  toStage: typeof pipelineStages.$inferSelect;
  becameWon: boolean;
  becameLost: boolean;
}

export async function moveLeadStage(
  viewer: Viewer,
  leadId: string,
  targetStageId: string,
  lostReason: string | undefined,
): Promise<StageMoveResult> {
  const lead = await findLeadForViewer(viewer, leadId);

  const [fromStage] = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.id, lead.stageId))
    .limit(1);
  const [toStage] = await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.id, targetStageId), eq(pipelineStages.tenantId, viewer.tenantId)))
    .limit(1);

  if (!toStage) throw new BadRequestError('Estágio de destino inválido', 'INVALID_STAGE');
  if (!fromStage) throw new NotFoundError('Estágio de origem não encontrado', 'STAGE_NOT_FOUND');
  if (fromStage.id === toStage.id) {
    throw new BadRequestError('Lead já está neste estágio', 'SAME_STAGE');
  }

  // Rule 7: a won deal cannot move back to a selling stage without admin permission.
  if (lead.status === 'won' && !toStage.isClosedWon && viewer.role !== 'admin') {
    throw new ForbiddenError('Apenas admin pode reabrir um negócio ganho', 'REOPEN_FORBIDDEN');
  }

  const becameWon = toStage.isClosedWon;
  const becameLost = toStage.isClosedLost;
  const status = becameWon ? 'won' : becameLost ? 'lost' : 'open';

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(leads)
      .set({
        stageId: toStage.id,
        status,
        lostReason: becameLost ? (lostReason ?? lead.lostReason) : null,
      })
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, viewer.tenantId)))
      .returning();

    await addTimelineEntry(
      {
        tenantId: viewer.tenantId,
        leadId,
        type: 'stage_change',
        content: `Estágio alterado de "${fromStage.name}" para "${toStage.name}"`,
        metadata: {
          from_stage: fromStage.name,
          to_stage: toStage.name,
          from_stage_id: fromStage.id,
          to_stage_id: toStage.id,
        },
        createdBy: viewer.userId,
      },
      tx,
    );
    return row!;
  });

  await automationQueue.add('stage_change', {
    tenantId: viewer.tenantId,
    leadId,
    triggerType: 'stage_change',
    payload: { fromStageId: fromStage.id, toStageId: toStage.id, fromStage: fromStage.name, toStage: toStage.name },
  });
  if (becameWon) {
    await automationQueue.add('deal_won', {
      tenantId: viewer.tenantId,
      leadId,
      triggerType: 'deal_won',
      payload: { stage: toStage.name },
    });
  }
  if (becameLost) {
    await automationQueue.add('deal_lost', {
      tenantId: viewer.tenantId,
      leadId,
      triggerType: 'deal_lost',
      payload: { stage: toStage.name, lostReason },
    });
  }

  return { lead: updated, fromStage, toStage, becameWon, becameLost };
}

export { findLeadForViewer };
