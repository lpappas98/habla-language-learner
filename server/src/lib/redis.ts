import { Redis } from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    redis.on('error', (err) => console.error('Redis error:', err.message));
  }
  return redis;
}

export async function cacheGet(key: string): Promise<string | null> {
  try { return await getRedis().get(key); }
  catch { return null; }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  try { await getRedis().setex(key, ttlSeconds, value); }
  catch {}
}
