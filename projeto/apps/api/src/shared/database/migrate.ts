import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from './client.js';

async function run(): Promise<void> {
  console.log('[migrate] running migrations...');

  // Ensure columns added after the initial schema exist — idempotent DDL guard
  // that runs before the Drizzle migrator so the app always starts cleanly.
  await db.execute(sql`ALTER TABLE forms ADD COLUMN IF NOT EXISTS target_stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL`);
  await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id varchar(80)`);
  await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_access_token_enc text`);

  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('[migrate] done');
  await queryClient.end();
}

run().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
