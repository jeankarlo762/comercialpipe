import { buildApp } from './app.js';
import { env } from './config/env.js';
import { redisAvailable } from './shared/redis/connection.js';

async function main(): Promise<void> {
  const app = await buildApp();

  // In development run the workers in-process for convenience; in production
  // run `npm run worker` as a separate process for horizontal scaling.
  if (env.NODE_ENV === 'development' && process.env.INLINE_WORKERS !== 'false' && redisAvailable) {
    const { startAiScoringWorker } = await import('./shared/queue/workers/ai-scoring.worker.js');
    const { startAutomationWorker } = await import('./shared/queue/workers/automation.worker.js');
    const { startMaintenanceWorker } = await import('./shared/queue/workers/maintenance.worker.js');
    startAiScoringWorker();
    startAutomationWorker();
    await startMaintenanceWorker();
    app.log.info('inline workers started (development mode)');
  }

  await app.listen({ host: env.API_HOST, port: env.API_PORT });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`received ${signal}, shutting down`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('failed to start server', err);
  process.exit(1);
});
