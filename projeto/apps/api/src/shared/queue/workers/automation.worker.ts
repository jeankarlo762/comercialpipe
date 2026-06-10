import { Worker } from 'bullmq';
import { bullConnection } from '../../redis/connection.js';
import { QUEUE_NAMES, type AutomationJob } from '../queues.js';
import { runAutomationsForTrigger } from '../../../modules/automations/automation.engine.js';

export function startAutomationWorker(): Worker<AutomationJob> {
  const worker = new Worker<AutomationJob>(
    QUEUE_NAMES.automation,
    async (job) => {
      const { tenantId, leadId, triggerType, payload } = job.data;
      const result = await runAutomationsForTrigger(tenantId, leadId, triggerType, payload);
      return result;
    },
    { connection: bullConnection(), concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[automation] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
