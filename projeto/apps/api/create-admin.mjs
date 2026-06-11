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
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { scrypt, randomBytes } from 'node:crypto';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

const sql = postgres(process.env.DATABASE_URL);

const EMAIL = 'admin@crm.com';
const PASSWORD = 'admincrm123';
const TENANT_NAME = 'CRM Admin';
const SLUG = 'crm';

async function run() {
  // Check if tenant slug exists
  const existing = await sql`SELECT id FROM tenants WHERE slug = ${SLUG} LIMIT 1`;

  let tenantId;
  if (existing.length > 0) {
    tenantId = existing[0].id;
    console.log(`Tenant '${SLUG}' já existe, usando id: ${tenantId}`);
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

  // Check if user already exists
  const existingUser = await sql`SELECT id FROM users WHERE email = ${EMAIL} LIMIT 1`;
  if (existingUser.length > 0) {
    console.log(`Usuário ${EMAIL} já existe. Atualizando senha...`);
    const passwordHash = await hashPassword(PASSWORD);
    await sql`UPDATE users SET password_hash = ${passwordHash} WHERE email = ${EMAIL}`;
    console.log('Senha atualizada com sucesso.');
  } else {
    const passwordHash = await hashPassword(PASSWORD);
    await sql`
      INSERT INTO users (tenant_id, name, email, password_hash, role)
      VALUES (${tenantId}, 'Admin CRM', ${EMAIL}, ${passwordHash}, 'admin')
    `;
    console.log(`Usuário criado: ${EMAIL}`);
  }

  console.log('\n✅ Conta admin pronta!');
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Senha: ${PASSWORD}`);
  await sql.end();
}

run().catch(err => { console.error(err); process.exit(1); });
