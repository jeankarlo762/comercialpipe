import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../shared/database/client.js';
import { googleAccounts } from '../../shared/database/schema.js';
import { decryptSecret, encryptSecret, hmacSign, hmacVerify } from '../../shared/security/crypto.js';
import { AppError } from '../../shared/errors/app-error.js';
import { getGoogleCredentials } from '../tenants/tenants.service.js';

const OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const CALENDAR_EVENTS = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

async function resolveCreds(tenantId: string): Promise<{ clientId: string; clientSecret: string } | null> {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  }
  return getGoogleCredentials(tenantId);
}

export async function isGoogleConfigured(tenantId: string): Promise<boolean> {
  const creds = await resolveCreds(tenantId);
  return Boolean(creds?.clientId && creds?.clientSecret);
}

interface StatePayload {
  userId: string;
  tenantId: string;
  exp: number;
}

export function signState(payload: Omit<StatePayload, 'exp'>): string {
  const body = { ...payload, exp: Date.now() + 10 * 60 * 1000 };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${encoded}.${hmacSign(encoded, env.ENCRYPTION_KEY)}`;
}

export function verifyState(state: string): StatePayload {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature || !hmacVerify(encoded, env.ENCRYPTION_KEY, signature)) {
    throw new AppError(400, 'INVALID_STATE', 'State inválido');
  }
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as StatePayload;
  if (payload.exp < Date.now()) throw new AppError(400, 'STATE_EXPIRED', 'State expirado');
  return payload;
}

export async function buildAuthUrl(tenantId: string, state: string): Promise<string> {
  const creds = await resolveCreds(tenantId);
  if (!creds) throw new AppError(503, 'GOOGLE_NOT_CONFIGURED', 'Google não configurado');
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${OAUTH_BASE}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

async function postForm(url: string, body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, 'GOOGLE_TOKEN_ERROR', `Falha no OAuth Google: ${text.slice(0, 200)}`);
  }
  return (await response.json()) as TokenResponse;
}

async function fetchEmail(accessToken: string): Promise<string | null> {
  const response = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return null;
  const json = (await response.json()) as { email?: string };
  return json.email ?? null;
}

export async function handleCallback(code: string, state: string): Promise<void> {
  const { userId, tenantId } = verifyState(state);
  const creds = await resolveCreds(tenantId);
  if (!creds) throw new AppError(503, 'GOOGLE_NOT_CONFIGURED', 'Google não configurado');

  const tokens = await postForm(TOKEN_URL, {
    code,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });
  const email = await fetchEmail(tokens.access_token);
  const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

  const values = {
    tenantId,
    userId,
    email,
    accessTokenEnc: encryptSecret(tokens.access_token),
    refreshTokenEnc: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
    expiryDate,
    scope: tokens.scope ?? null,
  };

  await db
    .insert(googleAccounts)
    .values(values)
    .onConflictDoUpdate({ target: googleAccounts.userId, set: values });
}

export async function getStatus(userId: string): Promise<{ connected: boolean; email: string | null }> {
  const [account] = await db
    .select({ email: googleAccounts.email })
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId))
    .limit(1);
  return { connected: Boolean(account), email: account?.email ?? null };
}

export async function disconnect(userId: string): Promise<void> {
  await db.delete(googleAccounts).where(eq(googleAccounts.userId, userId));
}

async function getValidAccessToken(userId: string, tenantId: string): Promise<string | null> {
  const [account] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId))
    .limit(1);
  if (!account) return null;

  const stillValid = account.expiryDate && account.expiryDate.getTime() - 60_000 > Date.now();
  if (stillValid) return decryptSecret(account.accessTokenEnc);

  if (!account.refreshTokenEnc) return decryptSecret(account.accessTokenEnc);

  const creds = await resolveCreds(tenantId);
  if (!creds) return null;

  const refreshed = await postForm(TOKEN_URL, {
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: decryptSecret(account.refreshTokenEnc),
    grant_type: 'refresh_token',
  });
  await db
    .update(googleAccounts)
    .set({
      accessTokenEnc: encryptSecret(refreshed.access_token),
      expiryDate: new Date(Date.now() + refreshed.expires_in * 1000),
    })
    .where(eq(googleAccounts.userId, userId));
  return refreshed.access_token;
}

export interface CalendarEventResult {
  googleEventId: string | null;
  meetLink: string | null;
  htmlLink: string | null;
}

export async function createCalendarEvent(
  userId: string,
  tenantId: string,
  input: { summary: string; startsAt: string; endsAt?: string; description?: string },
): Promise<CalendarEventResult | null> {
  const accessToken = await getValidAccessToken(userId, tenantId);
  if (!accessToken) return null;

  const start = new Date(input.startsAt);
  const end = input.endsAt ? new Date(input.endsAt) : new Date(start.getTime() + 30 * 60 * 1000);

  const response = await fetch(`${CALENDAR_EVENTS}?conferenceDataVersion=1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, 'GOOGLE_CALENDAR_ERROR', `Falha ao criar evento: ${text.slice(0, 200)}`);
  }
  const event = (await response.json()) as { id?: string; hangoutLink?: string; htmlLink?: string };
  return {
    googleEventId: event.id ?? null,
    meetLink: event.hangoutLink ?? null,
    htmlLink: event.htmlLink ?? null,
  };
}

export function hasGoogleAccount(userId: string): Promise<boolean> {
  return db
    .select({ id: googleAccounts.id })
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId))
    .limit(1)
    .then((rows) => rows.length > 0);
}
