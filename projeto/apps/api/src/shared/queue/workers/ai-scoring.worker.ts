import { Worker } from 'bullmq';
import { bullConnection } from '../../redis/connection.js';
import { QUEUE_NAMES, type AiScoringJob } from '../queues.js';
import { scoreLead } from '../../../modules/ai/ai.service.js';
import { AppError } from '../../errors/app-error.js';

export function startAiScoringWorker(): Worker<AiScoringJob> {
  const worker = new Worker<AiScoringJob>(
    QUEUE_NAMES.aiScoring,
    async (job) => {
      const { tenantId, leadId } = job.data;
      try {
        const result = await scoreLead({ tenantId, userId: null }, leadId);
        return { score: result.score };
      } catch (err) {
        // Out of credits: do not retry indefinitely (rule 13 returns 402 upstream).
        if (err instanceof AppError && err.statusCode === 402) {
          return { skipped: true, reason: 'no_credits' };
        }
        throw err;
      }
    },
    { connection: bullConnection(), concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[ai-scoring] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
