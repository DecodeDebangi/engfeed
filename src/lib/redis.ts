import Redis from 'ioredis';

export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Redis is only a cache here, so commands fail fast when it's down and callers fall through to Postgres.
// BullMQ needs different settings; see queueConnection in queue.ts.
export const redis =
  globalForRedis.redis ??
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableReadyCheck: false,
  });

redis.on('error', (err) => console.warn('Redis error:', err.message));

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
