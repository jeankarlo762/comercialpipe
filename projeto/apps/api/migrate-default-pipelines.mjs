import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '.env'), 'utf8');
const DATABASE_URL = envContent.match(/DATABASE_URL=(.+)/)[1].trim();

const postgres = (await import('../../node_modules/postgres/src/index.js')).default;
const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

console.log('Seeding default pipelines...');

const tenants = await sql`SELECT id FROM tenants`;

for (const tenant of tenants) {
  const tenantId = tenant.id;

  // Get or create "Pipeline Principal" as default
  let [defaultPipeline] = await sql`
    SELECT id FROM pipelines WHERE tenant_id = ${tenantId} AND is_default = true LIMIT 1
  `;

  if (!defaultPipeline) {
    [defaultPipeline] = await sql`
      INSERT INTO pipelines (tenant_id, name, color, is_default, order_index)
      VALUES (${tenantId}, 'Pipeline Principal', '#6366f1', true, 0)
      RETURNING id
    `;
  } else {
    await sql`
      UPDATE pipelines SET name = 'Pipeline Principal', color = '#6366f1'
      WHERE id = ${defaultPipeline.id}
    `;
  }

  const pipelineId = defaultPipeline.id;

  // Get first new stage id to move existing leads to
  const newDefaultStages = [
    { name: 'Novo',             color: '#6366f1', isClosedWon: false, isClosedLost: false, orderIndex: 0 },
    { name: 'Contato',          color: '#3b82f6', isClosedWon: false, isClosedLost: false, orderIndex: 1 },
    { name: 'No-show',          color: '#ef4444', isClosedWon: false, isClosedLost: false, orderIndex: 2 },
    { name: 'Agendado',         color: '#f59e0b', isClosedWon: false, isClosedLost: false, orderIndex: 3 },
    { name: 'Proposta enviada', color: '#8b5cf6', isClosedWon: false, isClosedLost: false, orderIndex: 4 },
    { name: 'Venda feita',      color: '#10b981', isClosedWon: true,  isClosedLost: false, orderIndex: 5 },
  ];

  // Delete old stages (move leads first)
  const oldStages = await sql`
    SELECT id FROM pipeline_stages WHERE pipeline_id = ${pipelineId}
  `;

  if (oldStages.length > 0) {
    // Create the first new stage so we can move leads to it
    const [firstStage] = await sql`
      INSERT INTO pipeline_stages (tenant_id, pipeline_id, name, color, is_closed_won, is_closed_lost, order_index)
      VALUES (${tenantId}, ${pipelineId}, 'Novo', '#6366f1', false, false, 0)
      RETURNING id
    `;

    const oldIds = oldStages.map(s => s.id);
    // Move all leads from old stages to "Novo"
    await sql`
      UPDATE leads SET stage_id = ${firstStage.id}
      WHERE tenant_id = ${tenantId} AND stage_id = ANY(${oldIds}::uuid[])
    `;
    // Delete old stages
    await sql`DELETE FROM pipeline_stages WHERE id = ANY(${oldIds}::uuid[])`;

    // Create remaining stages
    for (let i = 1; i < newDefaultStages.length; i++) {
      const s = newDefaultStages[i];
      await sql`
        INSERT INTO pipeline_stages (tenant_id, pipeline_id, name, color, is_closed_won, is_closed_lost, order_index)
        VALUES (${tenantId}, ${pipelineId}, ${s.name}, ${s.color}, ${s.isClosedWon}, ${s.isClosedLost}, ${s.orderIndex})
      `;
    }
  } else {
    // No old stages, create all
    for (const s of newDefaultStages) {
      await sql`
        INSERT INTO pipeline_stages (tenant_id, pipeline_id, name, color, is_closed_won, is_closed_lost, order_index)
        VALUES (${tenantId}, ${pipelineId}, ${s.name}, ${s.color}, ${s.isClosedWon}, ${s.isClosedLost}, ${s.orderIndex})
      `;
    }
  }

  console.log(`  ✓ Pipeline Principal (${tenantId})`);

  // Create "Pipeline de Followup" if not exists
  const [existing] = await sql`
    SELECT id FROM pipelines WHERE tenant_id = ${tenantId} AND name = 'Pipeline de Followup' LIMIT 1
  `;

  if (!existing) {
    const [followup] = await sql`
      INSERT INTO pipelines (tenant_id, name, color, is_default, order_index)
      VALUES (${tenantId}, 'Pipeline de Followup', '#06b6d4', false, 1)
      RETURNING id
    `;

    const followupStages = [
      { name: 'Up 3 dias',  color: '#06b6d4', orderIndex: 0 },
      { name: 'Up 7 dias',  color: '#3b82f6', orderIndex: 1 },
      { name: 'Up 15 dias', color: '#f59e0b', orderIndex: 2 },
      { name: 'Up 30 dias', color: '#ef4444', orderIndex: 3 },
    ];

    for (const s of followupStages) {
      await sql`
        INSERT INTO pipeline_stages (tenant_id, pipeline_id, name, color, is_closed_won, is_closed_lost, order_index)
        VALUES (${tenantId}, ${followup.id}, ${s.name}, ${s.color}, false, false, ${s.orderIndex})
      `;
    }
    console.log(`  ✓ Pipeline de Followup (${tenantId})`);
  } else {
    console.log(`  - Pipeline de Followup já existe (${tenantId})`);
  }
}

await sql.end();
console.log('Done.');
