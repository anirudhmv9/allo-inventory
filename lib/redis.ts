import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? Redis.fromEnv();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
