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

async function run() {
  let tenantId;
  const existing = await sql`SELECT id FROM tenants WHERE slug = ${SLUG} LIMIT 1`;
  if (existing.length > 0) {
    tenantId = existing[0].id;
    console.log(`Tenant '${SLUG}' já existe: ${tenantId}`);
  } else {
    const apiKey = crypto.randomBytes(32).toString('hex');
    const [tenant] = await sql`
      INSERT INTO tenants (name, slug, status, api_key)
      VALUES (${TENANT_NAME}, ${SLUG}, 'trial', ${apiKey})
      RETURNING id
    `;
    tenantId = tenant.id;
    console.log(`Tenant criado: ${tenantId}`);
  }

  const passwordHash = await argon2.hash(PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const existingUser = await sql`SELECT id FROM users WHERE email = ${EMAIL} LIMIT 1`;
  if (existingUser.length > 0) {
    await sql`UPDATE users SET password_hash = ${passwordHash}, tenant_id = ${tenantId}, role = 'admin', is_active = true WHERE email = ${EMAIL}`;
    console.log(`Senha do usuário ${EMAIL} atualizada com argon2.`);
  } else {
    await sql`
      INSERT INTO users (tenant_id, name, email, password_hash, role, is_active)
      VALUES (${tenantId}, 'Admin CRM NX', ${EMAIL}, ${passwordHash}, 'admin', true)
    `;
    console.log(`Usuário criado: ${EMAIL}`);
  }

  console.log('\n✅ Conta admin pronta!');
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Senha: ${PASSWORD}`);
  await sql.end();
}

run().catch(err => { console.error(err); process.exit(1); });
