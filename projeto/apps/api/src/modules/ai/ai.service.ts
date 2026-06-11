import { and, count, eq, gte, isNull, sql } from 'drizzle-orm';
import {
  aiScoreResultSchema,
  emailDraftResultSchema,
  nbaResultSchema,
  type AiScore,
  type AiScoreResult,
  type EmailDraftRequest,
  type EmailDraftResult,
  type NbaResult,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import {
  accounts,
  contacts,
  leads,
  pipelineStages,
} from '../../shared/database/schema.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { redis } from '../../shared/redis/connection.js';
import { addTimelineEntry, getFullTimeline } from '../timeline/timeline.service.js';
import { commitCredits, ensureCredits } from './credits.service.js';
import { complete, extractJson } from './anthropic.client.js';

interface Actor {
  tenantId: string;
  userId: string | null;
}

async function loadLead(tenantId: string, leadId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId), isNull(leads.deletedAt)))
    .limit(1);
  if (!lead) throw new NotFoundError('Lead não encontrado', 'LEAD_NOT_FOUND');

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
  return { lead, contact: contact ?? null, account: account ?? null, stage: stage ?? null };
}

async function conversionStats(tenantId: string) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({
      won: sql<number>`count(*) filter (where ${leads.status} = 'won')::int`,
      lost: sql<number>`count(*) filter (where ${leads.status} = 'lost')::int`,
      open: sql<number>`count(*) filter (where ${leads.status} = 'open')::int`,
    })
    .from(leads)
    .where(and(eq(leads.tenantId, tenantId), gte(leads.createdAt, since)));
  const won = row?.won ?? 0;
  const lost = row?.lost ?? 0;
  const closed = won + lost;
  return {
    periodDays: 90,
    won,
    lost,
    open: row?.open ?? 0,
    winRate: closed > 0 ? Math.round((won / closed) * 100) : null,
  };
}

export async function scoreLead(actor: Actor, leadId: string): Promise<AiScoreResult> {
  await ensureCredits(actor.tenantId, 'lead_scoring');
  const { lead, contact, account } = await loadLead(actor.tenantId, leadId);
  const stats = await conversionStats(actor.tenantId);

  const leadData = {
    title: lead.title,
    estimatedValue: lead.estimatedValue,
    currency: lead.currency,
    source: lead.source,
    utm: lead.utmData,
    contact: contact && { name: contact.name, role: contact.roleTitle, email: contact.email },
    account: account && { name: account.name, industry: account.industry, size: account.size },
    customFields: lead.customFields,
  };

  const system =
    'Você é um especialista em vendas B2B. Responda SEMPRE com um único objeto JSON válido, sem texto adicional.';
  const prompt = `Analise os dados deste lead e atribua:
- Score: A (alta probabilidade >70%), B (média 40-70%), C (baixa 20-40%), D (<20%)
- Razão: 1-2 frases explicando o score

Dados do Lead:
${JSON.stringify(leadData, null, 2)}

Histórico de conversão do tenant (últimos 90 dias):
${JSON.stringify(stats, null, 2)}

Responda em JSON: {"score": "A|B|C|D", "reason": "...", "confidence": 0-100}`;

  const raw = await complete({ system, prompt, maxTokens: 400, temperature: 0.2 });
  const parsed = aiScoreResultSchema.parse(extractJson<unknown>(raw));

  await db
    .update(leads)
    .set({ aiScore: parsed.score as AiScore, aiScoreReason: parsed.reason })
    .where(eq(leads.id, leadId));

  await addTimelineEntry({
    tenantId: actor.tenantId,
    leadId,
    type: 'ai_action',
    content: `Score de IA: ${parsed.score} — ${parsed.reason}`,
    metadata: { confidence: parsed.confidence },
    aiGenerated: true,
    createdBy: actor.userId,
  });

  await commitCredits(actor.tenantId, 'lead_scoring', {
    userId: actor.userId,
    leadId,
    metadata: { score: parsed.score, confidence: parsed.confidence },
  });

  return parsed;
}

export async function summarizeTimeline(actor: Actor, leadId: string): Promise<{ summary: string }> {
  await ensureCredits(actor.tenantId, 'timeline_summary');
  const { lead } = await loadLead(actor.tenantId, leadId);
  const timeline = await getFullTimeline(actor.tenantId, leadId);

  const system = 'Você é um assistente de vendas que escreve resumos executivos claros em português.';
  const prompt = `Crie um resumo executivo em 3 parágrafos desta oportunidade para que o vendedor
possa entrar em uma reunião bem preparado.

Inclua:
1. Contexto da oportunidade e histórico de contato
2. Últimas interações e estado atual da negociação
3. Próximos passos recomendados

Oportunidade: ${lead.title}
Timeline completa:
${JSON.stringify(
    timeline.map((t) => ({ type: t.type, content: t.content, at: t.createdAt })),
    null,
    2,
  )}`;

  const summary = await complete({ system, prompt, maxTokens: 900, temperature: 0.5 });

  await addTimelineEntry({
    tenantId: actor.tenantId,
    leadId,
    type: 'ai_action',
    content: 'Resumo executivo gerado pela IA (Preparar para reunião)',
    aiGenerated: true,
    createdBy: actor.userId,
  });

  await commitCredits(actor.tenantId, 'timeline_summary', { userId: actor.userId, leadId });
  return { summary };
}

export async function nextBestAction(
  actor: Actor,
  leadId: string,
  forceRefresh = false,
): Promise<{ result: NbaResult; cached: boolean }> {
  const { lead, stage } = await loadLead(actor.tenantId, leadId);
  const cacheKey = `nba:${actor.tenantId}:${leadId}:${lead.stageId}:${lead.lastActivityAt.getTime()}`;

  if (!forceRefresh) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { result: nbaResultSchema.parse(JSON.parse(cached)), cached: true };
    }
  }

  await ensureCredits(actor.tenantId, 'next_best_action');
  const timeline = await getFullTimeline(actor.tenantId, leadId, 30);
  const daysSinceLastContact = Math.floor(
    (Date.now() - lead.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000),
  );

  const system =
    'Você é um coach de vendas B2B. Responda SEMPRE com um único objeto JSON válido, sem texto adicional.';
  const prompt = `Com base no estágio atual e histórico deste lead, sugira a MELHOR PRÓXIMA AÇÃO
para o vendedor aumentar a probabilidade de fechamento.

Retorne JSON:
{
  "action_type": "send_email|make_call|schedule_meeting|send_proposal|follow_up",
  "priority": "high|medium|low",
  "suggested_message": "Mensagem ou roteiro completo...",
  "reasoning": "Por que esta ação agora...",
  "best_time": "Quando fazer (ex: amanhã manhã, próxima segunda)"
}

Dados:
${JSON.stringify(
    {
      lead: { title: lead.title, status: lead.status, aiScore: lead.aiScore },
      stage: stage?.name,
      daysSinceLastContact,
      recentTimeline: timeline.map((t) => ({ type: t.type, content: t.content })),
    },
    null,
    2,
  )}`;

  const raw = await complete({ system, prompt, maxTokens: 700, temperature: 0.5 });
  const result = nbaResultSchema.parse(extractJson<unknown>(raw));

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
  await commitCredits(actor.tenantId, 'next_best_action', { userId: actor.userId, leadId });
  return { result, cached: false };
}

export async function emailDraft(
  actor: Actor,
  leadId: string,
  request: EmailDraftRequest,
): Promise<EmailDraftResult> {
  await ensureCredits(actor.tenantId, 'email_draft');
  const { lead, contact, account } = await loadLead(actor.tenantId, leadId);

  const system =
    'Você é um redator de vendas B2B. Responda SEMPRE com um único objeto JSON válido {"subject","body"}.';
  const prompt = `Redija um e-mail de vendas no template "${request.template}" com tom ${request.tone}.
${request.instructions ? `Instruções extras: ${request.instructions}` : ''}

Contexto:
${JSON.stringify(
    {
      opportunity: lead.title,
      contact: contact && { name: contact.name, role: contact.roleTitle },
      account: account && { name: account.name, industry: account.industry },
    },
    null,
    2,
  )}

Retorne JSON: {"subject": "...", "body": "..."}`;

  const raw = await complete({ system, prompt, maxTokens: 900, temperature: 0.6 });
  const result = emailDraftResultSchema.parse(extractJson<unknown>(raw));

  await commitCredits(actor.tenantId, 'email_draft', { userId: actor.userId, leadId });
  return result;
}

export async function countActiveLeads(tenantId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(leads)
    .where(and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt)));
  return row?.value ?? 0;
}
