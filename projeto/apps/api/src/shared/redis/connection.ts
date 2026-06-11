import type { ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.js';

export let redisAvailable = false;

// Minimal stub that silently ignores all operations when Redis is unavailable
const noopRedis = {
  get: async (_key: string) => null,
  set: async (..._args: unknown[]) => 'OK' as const,
  del: async (..._args: unknown[]) => 0,
  exists: async (..._args: unknown[]) => 0,
  expire: async (..._args: unknown[]) => 0,
  incr: async (_key: string) => 0,
  hget: async (..._args: unknown[]) => null,
  hset: async (..._args: unknown[]) => 0,
  on: (_event: string, _cb: unknown) => noopRedis,
};

type RedisLike = typeof noopRedis;
export let redis: RedisLike = noopRedis;

if (env.REDIS_URL) {
  try {
    const { Redis } = await import('ioredis');
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 4000,
      retryStrategy: (times: number) => (times > 2 ? null : 1000),
    });

    client.on('error', (err: Error) => {
      if (redisAvailable) {
        console.warn('[redis] error —', err.message.slice(0, 80));
        redisAvailable = false;
        redis = noopRedis;
      }
    });

    await client.connect()
      .then(() => {
        redisAvailable = true;
        redis = client as unknown as RedisLike;
        console.info('[redis] connected');
      })
      .catch((err: Error) => {
        console.warn('[redis] unavailable —', err.message.slice(0, 80));
      });
  } catch {
    console.warn('[redis] failed to initialise — queue features disabled');
  }
} else {
  console.info('[redis] no REDIS_URL configured — queue features disabled');
}

export function bullConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL || 'redis://localhost:6379');
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

export async function acquireLock(_key: string, _ttlMs: number): Promise<boolean> {
  return true;
}

export function createRedisConnection() {
  return null;
}
