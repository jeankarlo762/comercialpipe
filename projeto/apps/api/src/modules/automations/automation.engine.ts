import { and, eq, isNull } from 'drizzle-orm';
import {
  automationActionSchema,
  automationConditionSchema,
  type AutomationAction,
  type AutomationCondition,
  type TriggerType,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import {
  automationExecutions,
  automations,
  leads,
  users,
  type Lead,
} from '../../shared/database/schema.js';
import { acquireLock, redis } from '../../shared/redis/connection.js';
import { addTimelineEntry } from '../timeline/timeline.service.js';
import { createTask } from '../tasks/tasks.service.js';
import { scoreLead } from '../ai/ai.service.js';
import { ensureCredits } from '../ai/credits.service.js';
import { getN8nCredentials, getWebhookSecret } from '../tenants/tenants.service.js';
import { callOutboundWebhook, triggerWorkflow } from './n8n.client.js';

type Json = Record<string, unknown>;

function readField(lead: Lead, field: string): unknown {
  const map: Record<string, unknown> = {
    ai_score: lead.aiScore,
    status: lead.status,
    estimated_value: lead.estimatedValue ? Number(lead.estimatedValue) : null,
    probability: lead.probability,
    source: lead.source,
    stage_id: lead.stageId,
    owner_id: lead.ownerId,
    currency: lead.currency,
  };
  if (field in map) return map[field];
  const custom = lead.customFields as Json | null;
  return custom?.[field];
}

export function evaluateConditions(conditions: AutomationCondition[], lead: Lead): boolean {
  return conditions.every((condition) => {
    const actual = readField(lead, condition.field);
    const expected = condition.value;
    switch (condition.op) {
      case 'eq':
        return actual === expected;
      case 'neq':
        return actual !== expected;
      case 'gt':
        return Number(actual) > Number(expected);
      case 'gte':
        return Number(actual) >= Number(expected);
      case 'lt':
        return Number(actual) < Number(expected);
      case 'lte':
        return Number(actual) <= Number(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'contains':
        return typeof actual === 'string' && actual.includes(String(expected));
      default:
        return false;
    }
  });
}

function triggerConfigMatches(
  triggerConfig: Json,
  triggerType: TriggerType,
  payload: Json,
): boolean {
  if (triggerType === 'stage_change') {
    if (triggerConfig.toStageId && triggerConfig.toStageId !== payload.toStageId) return false;
    if (triggerConfig.fromStageId && triggerConfig.fromStageId !== payload.fromStageId) return false;
  }
  return true;
}

interface ActionOutcome {
  type: string;
  status: 'success' | 'failed' | 'skipped';
  detail?: unknown;
  error?: string;
}

async function executeAction(
  tenantId: string,
  lead: Lead,
  action: AutomationAction,
  payload: Json,
): Promise<ActionOutcome> {
  const config = action.config as Json;
  switch (action.type) {
    case 'add_timeline_note': {
      await addTimelineEntry({
        tenantId,
        leadId: lead.id,
        type: 'ai_action',
        content: String(config.content ?? 'Nota automática'),
        metadata: { automation: true },
        createdBy: null,
      });
      return { type: action.type, status: 'success' };
    }
    case 'create_task': {
      const task = await createTask(tenantId, lead.ownerId ?? lead.createdBy ?? lead.id, {
        leadId: lead.id,
        title: String(config.title ?? 'Tarefa automática'),
        description: config.description ? String(config.description) : null,
        assignedTo: (config.assignedTo as string | undefined) ?? lead.ownerId ?? undefined,
        dueDate: (config.dueDate as string | undefined) ?? null,
      });
      return { type: action.type, status: 'success', detail: { taskId: task?.id } };
    }
    case 'assign_lead': {
      const mode = config.mode as string | undefined;

      if (mode === 'round_robin') {
        const configuredIds = config.userIds as string[] | undefined;
        let pool: { id: string }[];
        if (configuredIds && configuredIds.length > 0) {
          pool = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));
          pool = pool.filter((u) => configuredIds.includes(u.id));
        } else {
          pool = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));
        }
        if (pool.length === 0)
          return { type: action.type, status: 'failed', error: 'nenhum usuário disponível na rotação' };
        const idx = await redis.incr(`dist:rr:${tenantId}`);
        const picked = pool[(idx - 1) % pool.length]!;
        await db.update(leads).set({ ownerId: picked.id }).where(eq(leads.id, lead.id));
        await addTimelineEntry({
          tenantId,
          leadId: lead.id,
          type: 'system',
          content: 'Lead distribuído automaticamente (round-robin)',
          metadata: { ownerId: picked.id },
          createdBy: null,
        });
        return { type: action.type, status: 'success', detail: { ownerId: picked.id } };
      }

      const ownerId = config.ownerId as string | undefined;
      if (!ownerId) return { type: action.type, status: 'failed', error: 'ownerId ausente' };
      await db.update(leads).set({ ownerId }).where(eq(leads.id, lead.id));
      await addTimelineEntry({
        tenantId,
        leadId: lead.id,
        type: 'system',
        content: 'Lead reatribuído por automação',
        metadata: { ownerId },
        createdBy: null,
      });
      return { type: action.type, status: 'success' };
    }
    case 'change_stage': {
      const stageId = config.stageId as string | undefined;
      if (!stageId) return { type: action.type, status: 'failed', error: 'stageId ausente' };
      await db.update(leads).set({ stageId }).where(eq(leads.id, lead.id));
      await addTimelineEntry({
        tenantId,
        leadId: lead.id,
        type: 'stage_change',
        content: 'Estágio alterado por automação',
        metadata: { to_stage_id: stageId, automation: true },
        createdBy: null,
      });
      return { type: action.type, status: 'success' };
    }
    case 'ai_score': {
      await ensureCredits(tenantId, 'lead_scoring');
      const result = await scoreLead({ tenantId, userId: null }, lead.id);
      return { type: action.type, status: 'success', detail: { score: result.score } };
    }
    case 'n8n_workflow':
    case 'send_email': {
      const credentials = await getN8nCredentials(tenantId);
      if (!credentials) return { type: action.type, status: 'failed', error: 'n8n não configurado' };
      const workflowId = String(config.workflowId ?? '');
      if (!workflowId) return { type: action.type, status: 'failed', error: 'workflowId ausente' };
      const result = await triggerWorkflow(credentials, tenantId, workflowId, {
        event: payload.triggerType ?? 'automation',
        actionType: action.type,
        lead,
        config,
        triggered_at: new Date().toISOString(),
      });
      return {
        type: action.type,
        status: result.ok ? 'success' : 'failed',
        detail: { status: result.status },
      };
    }
    case 'webhook_outbound': {
      const url = config.url as string | undefined;
      if (!url) return { type: action.type, status: 'failed', error: 'url ausente' };
      const secret = await getWebhookSecret(tenantId);
      const result = await callOutboundWebhook(url, { lead, config, payload }, secret);
      return {
        type: action.type,
        status: result.ok ? 'success' : 'failed',
        detail: { status: result.status },
      };
    }
    default:
      return { type: action.type, status: 'skipped' };
  }
}

export interface RunResult {
  matched: number;
  executed: string[];
}

export async function runAutomationsForTrigger(
  tenantId: string,
  leadId: string,
  triggerType: TriggerType,
  payload: Json,
): Promise<RunResult> {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId), isNull(leads.deletedAt)))
    .limit(1);
  if (!lead) return { matched: 0, executed: [] };

  const candidates = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.tenantId, tenantId),
        eq(automations.triggerType, triggerType),
        eq(automations.isActive, true),
      ),
    );

  const executed: string[] = [];

  for (const automation of candidates) {
    const triggerConfig = (automation.triggerConfig ?? {}) as Json;
    if (!triggerConfigMatches(triggerConfig, triggerType, payload)) continue;

    const conditions = (automation.conditions as unknown[]).map((c) =>
      automationConditionSchema.parse(c),
    );
    if (!evaluateConditions(conditions, lead)) continue;

    // Rule 11: idempotency lock — same event+lead cannot fire twice within 60s.
    const lockKey = `automation:${automation.id}:${leadId}:${triggerType}`;
    const acquired = await acquireLock(lockKey, 60_000);
    if (!acquired) continue;

    await executeAutomation(tenantId, leadId, lead, automation, triggerType, payload);
    executed.push(automation.id);
  }

  return { matched: candidates.length, executed };
}

export async function executeAutomation(
  tenantId: string,
  leadId: string,
  lead: Lead,
  automation: typeof automations.$inferSelect,
  triggerType: TriggerType,
  payload: Json,
): Promise<void> {
  const [execution] = await db
    .insert(automationExecutions)
    .values({
      automationId: automation.id,
      tenantId,
      leadId,
      status: 'running',
      triggerPayload: { triggerType, ...payload },
      startedAt: new Date(),
    })
    .returning({ id: automationExecutions.id });

  const actions = (automation.actions as unknown[]).map((a) => automationActionSchema.parse(a));
  const outcomes: ActionOutcome[] = [];
  let anyFailure = false;

  for (const action of actions) {
    try {
      const outcome = await executeAction(tenantId, lead, action, { ...payload, triggerType });
      outcomes.push(outcome);
      if (outcome.status === 'failed') anyFailure = true;
    } catch (err) {
      // Rule 12: a failed action does not block subsequent actions.
      anyFailure = true;
      outcomes.push({
        type: action.type,
        status: 'failed',
        error: err instanceof Error ? err.message : 'erro desconhecido',
      });
    }
  }

  await db
    .update(automationExecutions)
    .set({
      status: anyFailure ? 'failed' : 'success',
      resultPayload: { outcomes },
      errorMessage: anyFailure ? 'Uma ou mais ações falharam' : null,
      finishedAt: new Date(),
    })
    .where(eq(automationExecutions.id, execution!.id));

  await db
    .update(automations)
    .set({
      executionCount: automation.executionCount + 1,
      lastExecutedAt: new Date(),
    })
    .where(eq(automations.id, automation.id));
}
