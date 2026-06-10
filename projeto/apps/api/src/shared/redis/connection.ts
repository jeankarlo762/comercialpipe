import { Redis } from 'ioredis';
import type { ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * BullMQ connection as a plain options object (parsed from REDIS_URL).
 * Passing options instead of an ioredis instance avoids duplicated-types
 * mismatches between the app's ioredis and the one bundled by bullmq.
 */
export function bullConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL);
  const options: ConnectionOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    maxRetriesPerRequest: null,
  };
  if (url.password) options.password = decodeURIComponent(url.password);
  if (url.username) options.username = decodeURIComponent(url.username);
  if (url.pathname.length > 1) options.db = Number(url.pathname.slice(1)) || 0;
  if (url.protocol === 'rediss:') options.tls = {};
  return options;
}

/**
 * Acquire a short-lived distributed lock. Returns true if acquired.
 * Used for automation idempotency (rule 11).
 */
export async function acquireLock(key: string, ttlMs: number): Promise<boolean> {
  const result = await redis.set(key, '1', 'PX', ttlMs, 'NX');
  return result === 'OK';
}

export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
