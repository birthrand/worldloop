import { createClient, type RedisClientType } from "redis";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/** TTLs in seconds — see prompts-worldloop/00-backend-overview.md */
export const CACHE_TTL = {
  country: 90 * 24 * 60 * 60,
  feed: 7 * 24 * 60 * 60,
  ai: 7 * 24 * 60 * 60,
  images: 30 * 24 * 60 * 60,
} as const;

export const cacheKeys = {
  country: (name: string) => `country:${name.toLowerCase()}`,
  feedCountries: (cursor = "all") => `feed:countries:${cursor}`,
  images: (name: string) => `images:${name.toLowerCase()}`,
  ai: (name: string) => `ai:${name.toLowerCase()}`,
} as const;

let client: RedisClientType | null = null;
let connected = false;

const CONNECT_TIMEOUT_MS = 2_000;

export async function connectCache(): Promise<void> {
  if (client) return;

  client = createClient({
    url: env.redisUrl,
    socket: {
      connectTimeout: CONNECT_TIMEOUT_MS,
      reconnectStrategy: false,
    },
  });

  client.on("error", (err) => {
    connected = false;
    logger.warn("Redis client error", {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  try {
    await Promise.race([
      client.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Redis connection timed out")),
          CONNECT_TIMEOUT_MS,
        ),
      ),
    ]);
    connected = true;
    logger.info("Redis connected");
  } catch (error) {
    connected = false;
    try {
      if (client.isOpen) await client.disconnect();
    } catch {
      /* ignore cleanup errors */
    }
    client = null;
    logger.warn("Redis unavailable — running without cache", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function disconnectCache(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
  connected = false;
}

function isReady(): boolean {
  return Boolean(client?.isOpen && connected);
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isReady() || !client) return null;

  try {
    const raw = await client.get(key);
    if (!raw) {
      logger.debug("Cache miss", { key });
      return null;
    }
    logger.debug("Cache hit", { key });
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn("Cache get failed", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!isReady() || !client) return;

  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    logger.debug("Cache set", { key, ttlSeconds });
  } catch (error) {
    logger.warn("Cache set failed", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetchFn();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}
