import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const loader = process.loadEnvFile;
  if (typeof loader !== 'function') return;
  const candidates = [resolve(__dirname, '.env'), resolve(__dirname, '../../.env')];
  for (const p of candidates) {
    if (existsSync(p)) { loader(p); break; }
  }
}
loadEnv();

import postgres from 'postgres';
import argon2 from 'argon2';
import crypto from 'node:crypto';

const sql = postgres(process.env.DATABASE_URL);

const EMAIL = 'admin@crm.com';
const PASSWORD = 'admincrm123';
const TENANT_NAME = 'CRM NX';
const SLUG = 'crm';

const DEFAULT_STAGES = [
  { name: 'Novo Lead',        color: '#6366f1', orderIndex: 0, isClosedWon: false, isClosedLost: false },
  { name: 'Em Contato',       color: '#f59e0b', orderIndex: 1, isClosedWon: false, isClosedLost: false },
  { name: 'Proposta Enviada', color: '#3b82f6', orderIndex: 2, isClosedWon: false, isClosedLost: false },
  { name: 'Negociação',       color: '#8b5cf6', orderIndex: 3, isClosedWon: false, isClosedLost: false },
  { name: 'Fechado Ganho',    color: '#22c55e', orderIndex: 4, isClosedWon: true,  isClosedLost: false },
  { name: 'Fechado Perdido',  color: '#ef4444', orderIndex: 5, isClosedWon: false, isClosedLost: true  },
];

async function run() {
  // ── Tenant ──────────────────────────────────────────────────────────────────
  let tenantId;
  const existing = await sql`SELECT id FROM tenants WHERE slug = ${SLUG} LIMIT 1`;
  if (existing.length > 0) {
    tenantId = existing[0].id;
    console.log(`[seed] Tenant '${SLUG}' already exists: ${tenantId}`);
  } else {
    const apiKey = crypto.randomBytes(32).toString('hex');
    const [tenant] = await sql`
      INSERT INTO tenants (name, slug, status, api_key)
      VALUES (${TENANT_NAME}, ${SLUG}, 'trial', ${apiKey})
      RETURNING id
    `;
    tenantId = tenant.id;
    console.log(`[seed] Tenant created: ${tenantId}`);
  }

  // ── Admin user ───────────────────────────────────────────────────────────────
  const existingUser = await sql`SELECT id FROM users WHERE email = ${EMAIL} LIMIT 1`;
  if (existingUser.length > 0) {
    console.log(`[seed] User ${EMAIL} already exists — skipping`);
  } else {
    const passwordHash = await argon2.hash(PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await sql`
      INSERT INTO users (tenant_id, name, email, password_hash, role, is_active)
      VALUES (${tenantId}, 'Admin CRM NX', ${EMAIL}, ${passwordHash}, 'admin', true)
    `;
    console.log(`[seed] Admin user created: ${EMAIL}`);
  }

  // ── Default pipeline + stages ────────────────────────────────────────────────
  // Check for an existing default pipeline
  const existingPipeline = await sql`
    SELECT id FROM pipelines WHERE tenant_id = ${tenantId} AND is_default = true LIMIT 1
  `.catch(() => []); // table may not exist in very old DB versions

  let pipelineId;
  if (existingPipeline.length > 0) {
    pipelineId = existingPipeline[0].id;
    console.log(`[seed] Default pipeline already exists: ${pipelineId}`);
  } else {
    // Try creating a default pipeline (table may not exist for old schemas)
    const created = await sql`
      INSERT INTO pipelines (tenant_id, name, is_default, order_index)
      VALUES (${tenantId}, 'Vendas', true, 0)
      RETURNING id
    `.catch(() => null);

    if (created && created.length > 0) {
      pipelineId = created[0].id;
      console.log(`[seed] Default pipeline created: ${pipelineId}`);
    }
  }

  // Check if any stages exist for this tenant
  const existingStages = await sql`
    SELECT id FROM pipeline_stages WHERE tenant_id = ${tenantId} LIMIT 1
  `;

  if (existingStages.length > 0) {
    console.log('[seed] Pipeline stages already exist — skipping');
  } else {
    for (const s of DEFAULT_STAGES) {
      await sql`
        INSERT INTO pipeline_stages
          (tenant_id, pipeline_id, name, color, order_index, is_closed_won, is_closed_lost)
        VALUES
          (${tenantId}, ${pipelineId ?? null}, ${s.name}, ${s.color}, ${s.orderIndex}, ${s.isClosedWon}, ${s.isClosedLost})
      `;
    }
    console.log(`[seed] Created ${DEFAULT_STAGES.length} default stages`);
  }

  console.log('\n✅ Seed concluído!');
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Senha: ${PASSWORD}`);
  await sql.end();
}

run().catch(err => { console.error('[seed] Error:', err); process.exit(1); });
