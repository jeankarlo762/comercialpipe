import { registerTenant } from '../../modules/auth/auth.service.js';
import { createLead } from '../../modules/leads/leads.service.js';
import { queryClient } from './client.js';

async function run(): Promise<void> {
  console.log('[seed] creating demo tenant...');
  const { tenant, user } = await registerTenant({
    tenantName: 'Acme Vendas',
    slug: 'acme',
    name: 'Admin Demo',
    email: 'admin@acme.com',
    password: 'changeme123',
  });

  const viewer = { tenantId: tenant.id, userId: user.id, role: 'admin' as const };
  const titles = ['Implantação ERP', 'Licenças SaaS', 'Consultoria Cloud', 'Suporte Premium'];
  for (const title of titles) {
    await createLead(viewer, {
      title,
      currency: 'BRL',
      source: 'manual',
      estimatedValue: Math.round(Math.random() * 50000) + 5000,
    });
  }

  console.log('[seed] done. login: admin@acme.com / changeme123 (slug: acme)');
  await queryClient.end();
  // Conexões do BullMQ/Redis ficam abertas e impediriam o processo de sair.
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
