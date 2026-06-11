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

interface SimpleQueue<T> {
  add(name: string, data: T): Promise<unknown>;
}

function noopQueue<T>(queueName: string): SimpleQueue<T> {
  return {
    add: async (_name: string, _data: T) => {
      console.debug(`[queue] Redis unavailable — skipped job on "${queueName}"`);
    },
  };
}

async function tryRealQueue<T>(name: string): Promise<SimpleQueue<T>> {
  const { redisAvailable, bullConnection } = await import('../redis/connection.js');
  if (!redisAvailable) return noopQueue<T>(name);
  const { Queue } = await import('bullmq');
  return new Queue<T>(name, {
    connection: bullConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  }) as unknown as SimpleQueue<T>;
}

function lazyQueue<T>(name: string): SimpleQueue<T> {
  let inner: SimpleQueue<T> | undefined;
  return {
    add: async (jobName: string, data: T) => {
      if (!inner) inner = await tryRealQueue<T>(name);
      return inner.add(jobName, data);
    },
  };
}

export const aiScoringQueue = lazyQueue<AiScoringJob>(QUEUE_NAMES.aiScoring);
export const automationQueue = lazyQueue<AutomationJob>(QUEUE_NAMES.automation);
export const outboundQueue = lazyQueue<OutboundWebhookJob>(QUEUE_NAMES.outbound);
