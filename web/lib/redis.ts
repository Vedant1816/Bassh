// lib/redis.ts
import Redis from "ioredis";

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => (times <= 3 ? 1000 : null),
  });
  client.on("error", (err) => {
    console.warn("[redis] connection error:", err.message);
  });
  return client;
}

export const redis: Redis | null = createRedis();