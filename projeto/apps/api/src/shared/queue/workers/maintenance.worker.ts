import { Queue, Worker } from 'bullmq';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { bullConnection } from '../../redis/connection.js';
import { db } from '../../database/client.js';
import { automations, leads } from '../../database/schema.js';
import { resetAllDueCredits } from '../../../modules/ai/credits.service.js';
import { automationQueue } from '../queues.js';

const MAINTENANCE_QUEUE = 'maintenance';

type MaintenanceJob = { task: 'credits_reset' | 'inactivity_scan' };

async function runInactivityScan(): Promise<number> {
  const rules = await db
    .select()
    .from(automations)
    .where(and(eq(automations.triggerType, 'inactivity'), eq(automations.isActive, true)));

  let enqueued = 0;
  for (const rule of rules) {
    const days = Number((rule.triggerConfig as Record<string, unknown>)?.inactivityDays ?? 7);
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const stale = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, rule.tenantId),
          eq(leads.status, 'open'),
          isNull(leads.deletedAt),
          lt(leads.lastActivityAt, threshold),
        ),
      );

    for (const lead of stale) {
      await automationQueue.add('inactivity', {
        tenantId: rule.tenantId,
        leadId: lead.id,
        triggerType: 'inactivity',
        payload: { inactivityDays: days, automationId: rule.id },
      });
      enqueued += 1;
    }
  }
  return enqueued;
}

export async function startMaintenanceWorker(): Promise<Worker<MaintenanceJob>> {
  const queue = new Queue<MaintenanceJob>(MAINTENANCE_QUEUE, { connection: bullConnection() });

  // Rule 15: reset AI credits at the start of each month (run daily, no-op until due).
  await queue.add(
    'credits_reset',
    { task: 'credits_reset' },
    { repeat: { pattern: '0 2 * * *' }, jobId: 'credits_reset' },
  );
  // Inactivity sweep every hour.
  await queue.add(
    'inactivity_scan',
    { task: 'inactivity_scan' },
    { repeat: { pattern: '0 * * * *' }, jobId: 'inactivity_scan' },
  );

  const worker = new Worker<MaintenanceJob>(
    MAINTENANCE_QUEUE,
    async (job) => {
      if (job.data.task === 'credits_reset') {
        const resets = await resetAllDueCredits();
        return { resets };
      }
      const enqueued = await runInactivityScan();
      return { enqueued };
    },
    { connection: bullConnection(), concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[maintenance] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
