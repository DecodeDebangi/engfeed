import Redis from 'ioredis';

// The BullMQ worker always needs Redis, so it falls back to a local one
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Redis is only a cache here, and it's optional: without REDIS_URL it's off and every request goes to
// Postgres. When set, commands fail fast if it's down, so callers fall through to Postgres too.
// BullMQ needs different settings; see queueConnection in queue.ts.
export const redis = process.env.REDIS_URL
  ? globalForRedis.redis ??
    new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableReadyCheck: false,
    })
  : null;

redis?.on('error', (err) => console.warn('Redis error:', err.message));

if (redis && process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
