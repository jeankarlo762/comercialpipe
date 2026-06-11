/**
 * Seed two complete example forms for the CRM NX tenant.
 * Run once after create-admin.mjs:
 *   DATABASE_URL=<url> node apps/api/seed-forms.mjs
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import crypto from 'node:crypto';

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

const sql = postgres(process.env.DATABASE_URL);

const SLUG = 'crm';

const FORM_1 = {
  name: 'Interesse em Nossos Serviços',
  description: 'Preencha o formulário e nossa equipe entrará em contato em até 24 horas.',
  fields: [
    { key: 'cargo', label: 'Cargo / Função', type: 'text', required: false },
    { key: 'segmento', label: 'Segmento da empresa', type: 'text', required: false },
    { key: 'numero_funcionarios', label: 'Número de funcionários', type: 'number', required: false },
    { key: 'faturamento_mensal', label: 'Faturamento mensal estimado', type: 'currency', required: false },
    { key: 'como_conheceu', label: 'Como nos conheceu?', type: 'checkbox', required: false,
      options: ['Google', 'Indicação', 'Redes Sociais', 'Evento', 'Outro'] },
    { key: 'aceita_contato_whatsapp', label: 'Aceita contato via WhatsApp?', type: 'checkbox', required: false },
    { key: 'observacoes', label: 'Observações', type: 'textarea', required: false },
  ],
};

const FORM_2 = {
  name: 'Solicitação de Orçamento',
  description: 'Informe os detalhes do seu projeto para receber uma proposta personalizada.',
  fields: [
    { key: 'tipo_projeto', label: 'Tipo de projeto', type: 'text', required: true },
    { key: 'valor_investimento', label: 'Valor disponível para investimento', type: 'currency', required: false },
    { key: 'prazo_implementacao', label: 'Prazo desejado (meses)', type: 'number', required: false },
    { key: 'servicos_interesse', label: 'Serviços de interesse', type: 'checkbox', required: false,
      options: ['Consultoria', 'Implementação', 'Treinamento', 'Suporte mensal', 'Personalização'] },
    { key: 'ja_usa_crm', label: 'Já utiliza algum CRM?', type: 'checkbox', required: false },
    { key: 'crm_atual', label: 'CRM atual (se houver)', type: 'text', required: false },
    { key: 'descricao_necessidade', label: 'Descreva sua necessidade', type: 'textarea', required: true },
  ],
};

function generatePublicId() {
  return crypto.randomBytes(16).toString('hex');
}

async function run() {
  // Resolve tenant
  const [tenant] = await sql`SELECT id FROM tenants WHERE slug = ${SLUG} LIMIT 1`;
  if (!tenant) {
    console.error(`[seed-forms] Tenant '${SLUG}' not found. Run create-admin.mjs first.`);
    process.exit(1);
  }
  const tenantId = tenant.id;

  // Resolve admin user
  const [user] = await sql`SELECT id FROM users WHERE tenant_id = ${tenantId} AND role = 'admin' LIMIT 1`;
  const createdBy = user?.id ?? null;

  for (const form of [FORM_1, FORM_2]) {
    const exists = await sql`
      SELECT id FROM forms WHERE tenant_id = ${tenantId} AND name = ${form.name} LIMIT 1
    `;
    if (exists.length > 0) {
      console.log(`[seed-forms] Form '${form.name}' already exists — skipping`);
      continue;
    }

    await sql`
      INSERT INTO forms (tenant_id, created_by, name, description, fields, is_active, public_id)
      VALUES (
        ${tenantId},
        ${createdBy},
        ${form.name},
        ${form.description},
        ${JSON.stringify(form.fields)}::jsonb,
        true,
        ${generatePublicId()}
      )
    `;
    console.log(`[seed-forms] Form '${form.name}' created`);
  }

  console.log('\n✅ Forms seed concluído!');
  await sql.end();
}

run().catch(err => { console.error('[seed-forms] Error:', err); process.exit(1); });
