import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from './client.js';

async function run(): Promise<void> {
  console.log('[migrate] running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('[migrate] done');
  await queryClient.end();
}

run().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
