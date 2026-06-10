import { Queue } from 'bullmq';
import { bullConnection } from '../redis/connection.js';

export const QUEUE_NAMES = {
  aiScoring: 'ai-scoring',
  automation: 'automation-engine',
  outbound: 'outbound-webhook',
} as const;

export interface AiScoringJob {
  tenantId: string;
  leadId: string;
  triggeredBy: 'webhook' | 'manual' | 'automation';
}

export interface AutomationJob {
  tenantId: string;
  leadId: string;
  triggerType:
    | 'stage_change'
    | 'new_lead'
    | 'inactivity'
    | 'deal_won'
    | 'deal_lost'
    | 'webhook'
    | 'manual';
  payload: Record<string, unknown>;
}

export interface OutboundWebhookJob {
  url: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
  tenantId: string;
}

const connection = bullConnection();

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export const aiScoringQueue = new Queue<AiScoringJob>(QUEUE_NAMES.aiScoring, {
  connection,
  defaultJobOptions,
});

export const automationQueue = new Queue<AutomationJob>(QUEUE_NAMES.automation, {
  connection,
  defaultJobOptions,
});

export const outboundQueue = new Queue<OutboundWebhookJob>(QUEUE_NAMES.outbound, {
  connection,
  defaultJobOptions: { ...defaultJobOptions, attempts: 5 },
});
