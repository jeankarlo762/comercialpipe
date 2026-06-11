import type { ApiResponse, PaginationMeta } from '@commercialpipe/shared-types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details: unknown[];

  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  skipAuthRetry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE_URL}/v1${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function rawRequest<T>(path: string, options: RequestOptions): Promise<{ data: T; meta?: PaginationMeta }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !json || json.success === false) {
    const err = json && json.success === false ? json.error : null;
    throw new ApiError(
      response.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Erro inesperado',
      err?.details ?? [],
    );
  }

  return { data: json.data, meta: json.meta };
}

async function tryRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    const json = (await response.json().catch(() => null)) as ApiResponse<{ accessToken: string }> | null;
    if (response.ok && json && json.success && json.data.accessToken) {
      accessToken = json.data.accessToken;
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && !options.skipAuthRetry) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return rawRequest<T>(path, { ...options, skipAuthRetry: true });
      }
      onUnauthorized?.();
    }
    throw err;
  }
}

export async function apiGet<T>(path: string, query?: RequestOptions['query']): Promise<T> {
  return (await apiRequest<T>(path, { method: 'GET', query })).data;
}

export async function apiGetPaginated<T>(
  path: string,
  query?: RequestOptions['query'],
): Promise<{ data: T; meta?: PaginationMeta }> {
  return apiRequest<T>(path, { method: 'GET', query });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return (await apiRequest<T>(path, { method: 'POST', body })).data;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return (await apiRequest<T>(path, { method: 'PATCH', body })).data;
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  return (await apiRequest<T>(path, { method: 'DELETE', body })).data;
}

export { BASE_URL };
