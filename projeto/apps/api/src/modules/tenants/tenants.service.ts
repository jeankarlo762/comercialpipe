import { eq } from 'drizzle-orm';
import type { N8nConfigInput } from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { tenants } from '../../shared/database/schema.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { decryptSecret, encryptSecret } from '../../shared/security/crypto.js';

export async function getTenant(tenantId: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) throw new NotFoundError('Tenant não encontrado', 'TENANT_NOT_FOUND');
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    apiKey: tenant.apiKey,
    aiCreditsLimit: tenant.aiCreditsLimit,
    aiCreditsUsed: tenant.aiCreditsUsed,
    aiCreditsResetAt: tenant.aiCreditsResetAt,
    n8nBaseUrl: tenant.n8nBaseUrl,
    n8nConfigured: Boolean(tenant.n8nBaseUrl && tenant.n8nApiKeyEnc && tenant.n8nWebhookSecretEnc),
    googleConfigured: Boolean(tenant.googleClientIdEnc && tenant.googleClientSecretEnc),
    createdAt: tenant.createdAt,
  };
}

export async function updateN8nConfig(tenantId: string, input: N8nConfigInput) {
  await db
    .update(tenants)
    .set({
      n8nBaseUrl: input.n8nBaseUrl,
      n8nApiKeyEnc: input.n8nApiKey ? encryptSecret(input.n8nApiKey) : null,
      n8nWebhookSecretEnc: input.n8nWebhookSecret ? encryptSecret(input.n8nWebhookSecret) : null,
    })
    .where(eq(tenants.id, tenantId));
  return getTenant(tenantId);
}

export interface N8nCredentials {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
}

export async function getN8nCredentials(tenantId: string): Promise<N8nCredentials | null> {
  const [tenant] = await db
    .select({
      baseUrl: tenants.n8nBaseUrl,
      apiKeyEnc: tenants.n8nApiKeyEnc,
      webhookSecretEnc: tenants.n8nWebhookSecretEnc,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant?.baseUrl || !tenant.apiKeyEnc || !tenant.webhookSecretEnc) {
    return null;
  }
  return {
    baseUrl: tenant.baseUrl,
    apiKey: decryptSecret(tenant.apiKeyEnc),
    webhookSecret: decryptSecret(tenant.webhookSecretEnc),
  };
}

export async function getWebhookSecret(tenantId: string): Promise<string | null> {
  const [tenant] = await db
    .select({ webhookSecretEnc: tenants.n8nWebhookSecretEnc })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return tenant?.webhookSecretEnc ? decryptSecret(tenant.webhookSecretEnc) : null;
}

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
}

export async function updateGoogleCredentials(
  tenantId: string,
  clientId: string | null,
  clientSecret: string | null,
) {
  await db
    .update(tenants)
    .set({
      googleClientIdEnc: clientId ? encryptSecret(clientId) : null,
      googleClientSecretEnc: clientSecret ? encryptSecret(clientSecret) : null,
    })
    .where(eq(tenants.id, tenantId));
  return getTenant(tenantId);
}

export async function getGoogleCredentials(tenantId: string): Promise<GoogleCredentials | null> {
  const [tenant] = await db
    .select({
      clientIdEnc: tenants.googleClientIdEnc,
      clientSecretEnc: tenants.googleClientSecretEnc,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant?.clientIdEnc || !tenant.clientSecretEnc) return null;
  return {
    clientId: decryptSecret(tenant.clientIdEnc),
    clientSecret: decryptSecret(tenant.clientSecretEnc),
  };
}
