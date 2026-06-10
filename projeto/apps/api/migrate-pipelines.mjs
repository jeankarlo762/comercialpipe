import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '.env');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=(.+)/);
if (!match) throw new Error('DATABASE_URL not found in .env');
const DATABASE_URL = match[1].trim();

const postgres = (await import('../../node_modules/postgres/src/index.js')).default;
const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

console.log('Running pipelines migration...');

await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(9) NOT NULL DEFAULT '#6366f1',
    is_default BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS pipelines_tenant_idx ON pipelines(tenant_id);

  ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE;

  -- Create default pipeline for each tenant that already has stages
  INSERT INTO pipelines (tenant_id, name, is_default, order_index)
  SELECT DISTINCT tenant_id, 'Pipeline Principal', true, 0
  FROM pipeline_stages
  WHERE NOT EXISTS (
    SELECT 1 FROM pipelines p WHERE p.tenant_id = pipeline_stages.tenant_id
  );

  -- Assign existing stages to their tenant's default pipeline
  UPDATE pipeline_stages ps
  SET pipeline_id = p.id
  FROM pipelines p
  WHERE p.tenant_id = ps.tenant_id
    AND p.is_default = true
    AND ps.pipeline_id IS NULL;
`);

await sql.end();
console.log('Done.');
