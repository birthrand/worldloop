import { createClient, type RedisClientType } from "redis";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/** TTLs in seconds — see prompts-worldloop/00-backend-overview.md */
export const CACHE_TTL = {
  country: 90 * 24 * 60 * 60,
  feed: 7 * 24 * 60 * 60,
  search: 7 * 24 * 60 * 60,
  map: 30 * 24 * 60 * 60,
  discover: 24 * 60 * 60,
  ai: 7 * 24 * 60 * 60,
  images: 30 * 24 * 60 * 60,
  videos: 30 * 24 * 60 * 60,
  news: 4 * 60 * 60,
  wikipedia: 30 * 24 * 60 * 60,
  landmarks: 30 * 24 * 60 * 60,
  /** Negative caching — transient empty upstream results (e.g. video miss). */
  short: 15 * 60,
} as const;

export const cacheKeys = {
  country: (name: string) => `country:${name.trim().toLowerCase()}`,
  feedCountries: (cursor = "all", displayWidth = 1080) =>
    `feed:countries:${cursor}:w${displayWidth}`,
  cultureVideoIndex: () => "culture:video-index",
  cultureFeed: (
    seed: string,
    cursor: string,
    limit: number,
    displayWidth = 1080,
  ) => `feed:culture:${seed}:${cursor}:${limit}:w${displayWidth}`,
  search: (query: string, region: string, displayWidth = 1080) =>
    `search:${query.toLowerCase()}:${region.toLowerCase()}:w${displayWidth}`,
  mapCountries: (displayWidth = 640) => `map:countries:w${displayWidth}`,
  discover: (params: {
    west: number;
    south: number;
    east: number;
    north: number;
    centerLat: number;
    centerLng: number;
    region: string | null;
    limit: number;
    cursor: number;
  }) => {
    const regionPart = params.region?.trim().toLowerCase() ?? "all";
    const bboxPart = [
      params.west.toFixed(4),
      params.south.toFixed(4),
      params.east.toFixed(4),
      params.north.toFixed(4),
    ].join(":");
    const centerPart = [
      params.centerLat.toFixed(4),
      params.centerLng.toFixed(4),
    ].join(":");
    return `discover:${bboxPart}:${centerPart}:${regionPart}:${params.limit}:${params.cursor}`;
  },
  /** v2 — stores provider size variants; resolved URL picked at serve time. */
  images: (name: string) => `images:v2:${name.trim().toLowerCase()}`,
  videos: (name: string) => `videos:${name.trim().toLowerCase()}`,
  ai: (name: string) => `ai:${name.toLowerCase()}`,
  news: (name: string) => `news:${name.trim().toLowerCase()}`,
  wikipedia: (name: string) => `wikipedia:${name.trim().toLowerCase()}`,
  landmarks: (cca2: string) => `landmarks:v6:${cca2.trim().toUpperCase()}`,
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
    await client.connect();
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
