import { startAiScoringWorker } from './workers/ai-scoring.worker.js';
import { startAutomationWorker } from './workers/automation.worker.js';
import { startMaintenanceWorker } from './workers/maintenance.worker.js';

async function main(): Promise<void> {
  console.log('[worker] booting workers...');
  const ai = startAiScoringWorker();
  const automation = startAutomationWorker();
  const maintenance = await startMaintenanceWorker();
  console.log('[worker] ai-scoring, automation-engine and maintenance workers online');

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[worker] received ${signal}, draining...`);
    await Promise.all([ai.close(), automation.close(), maintenance.close()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
