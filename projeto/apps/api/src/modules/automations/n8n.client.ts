import { hmacSign } from '../../shared/security/crypto.js';
import type { N8nCredentials } from '../tenants/tenants.service.js';

const N8N_TIMEOUT_MS = 30_000;

export interface N8nTriggerResult {
  ok: boolean;
  status: number;
  body: unknown;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
  }
}

/** CRM -> n8n: trigger a workflow webhook with HMAC signature (rule 3). */
export async function triggerWorkflow(
  credentials: N8nCredentials,
  tenantId: string,
  workflowId: string,
  payload: Record<string, unknown>,
): Promise<N8nTriggerResult> {
  const body = JSON.stringify(payload);
  const signature = hmacSign(body, credentials.webhookSecret);
  const url = `${credentials.baseUrl.replace(/\/$/, '')}/webhook/${workflowId}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CRM-Tenant': tenantId,
        'X-CRM-Signature': signature,
      },
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* keep raw text */
    }
    return { ok: response.ok, status: response.status, body: parsed };
  } finally {
    clearTimeout(timer);
  }
}

/** List available workflows via the n8n REST API (used by the automations builder). */
export async function listWorkflows(credentials: N8nCredentials): Promise<unknown[]> {
  const url = `${credentials.baseUrl.replace(/\/$/, '')}/api/v1/workflows`;
  const response = await withTimeout(
    fetch(url, { headers: { 'X-N8N-API-KEY': credentials.apiKey, Accept: 'application/json' } }),
    N8N_TIMEOUT_MS,
  );
  if (!response.ok) {
    return [];
  }
  const json = (await response.json()) as { data?: unknown[] };
  return Array.isArray(json.data) ? json.data : [];
}

/** Generic outbound webhook (ERP, Slack, etc.) signed with the tenant secret. */
export async function callOutboundWebhook(
  url: string,
  body: Record<string, unknown>,
  secret: string | null,
  extraHeaders: Record<string, string> = {},
): Promise<N8nTriggerResult> {
  const serialized = JSON.stringify(body);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (secret) {
    headers['X-CRM-Signature'] = hmacSign(serialized, secret);
  }
  const response = await withTimeout(
    fetch(url, { method: 'POST', headers, body: serialized }),
    N8N_TIMEOUT_MS,
  );
  const text = await response.text();
  return { ok: response.ok, status: response.status, body: text };
}
