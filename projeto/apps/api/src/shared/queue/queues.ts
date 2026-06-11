// Queue stubs — BullMQ is only loaded in the worker process (worker-entry.ts).
// When Redis is unavailable the main API process uses these no-op stubs so
// authentication, pipeline and all other routes continue to work normally.

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

function noop(queueName: string) {
  return {
    add: async (_name: string, _data: unknown) => {
      console.debug(`[queue] Redis unavailable — skipped job on "${queueName}"`);
    },
  };
}

// Lazy real queues — only instantiated when Redis is available
async function tryRealQueue<T>(name: string) {
  const { redisAvailable, bullConnection } = await import('../redis/connection.js');
  if (!redisAvailable) return noop(name);
  const { Queue } = await import('bullmq');
  return new Queue<T>(name, {
    connection: bullConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
}

// Proxy that defers real Queue creation until first use
function lazyQueue<T>(name: string) {
  let inner: { add: (...args: unknown[]) => Promise<unknown> } | null = null;
  return {
    add: async (jobName: string, data: T) => {
      if (!inner) inner = await tryRealQueue<T>(name);
      return inner.add(jobName, data as never);
    },
  };
}

export const aiScoringQueue = lazyQueue<AiScoringJob>(QUEUE_NAMES.aiScoring);
export const automationQueue = lazyQueue<AutomationJob>(QUEUE_NAMES.automation);
export const outboundQueue = lazyQueue<OutboundWebhookJob>(QUEUE_NAMES.outbound);
