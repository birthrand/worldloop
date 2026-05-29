import { CLIENT_CACHE_SCHEMA_VERSION } from "@/constants/client-cache";
import {
  deleteCacheKey,
  getAllCacheKeys,
  readCacheString,
  writeCacheString,
} from "@/lib/client-storage";

type CacheEnvelope<T> = {
  v: number;
  savedAt: number;
  ttlSeconds: number;
  data: T;
};

function logCacheEvent(
  key: string,
  data: unknown,
  isFresh: boolean,
  isStale: boolean,
): void {
  if (__DEV__) {
    console.log("[client-cache]", { key, hit: !!data, isFresh, isStale });
  }
}

export async function getClientCache<T>(key: string): Promise<{
  data: T | null;
  isFresh: boolean;
  isStale: boolean;
  savedAt: number | null;
}> {
  try {
    const raw = await readCacheString(key);
    if (!raw) {
      logCacheEvent(key, null, false, false);
      return { data: null, isFresh: false, isStale: false, savedAt: null };
    }

    const envelope = JSON.parse(raw) as CacheEnvelope<T>;

    if (envelope.v !== CLIENT_CACHE_SCHEMA_VERSION) {
      await deleteCacheKey(key);
      logCacheEvent(key, null, false, false);
      return { data: null, isFresh: false, isStale: false, savedAt: null };
    }

    const now = Date.now();
    const expiresAt = envelope.savedAt + envelope.ttlSeconds * 1000;
    const isFresh = expiresAt > now;
    const isStale = !isFresh;

    logCacheEvent(key, envelope.data, isFresh, isStale);
    return {
      data: envelope.data,
      isFresh,
      isStale,
      savedAt: envelope.savedAt,
    };
  } catch {
    await deleteCacheKey(key);
    logCacheEvent(key, null, false, false);
    return { data: null, isFresh: false, isStale: false, savedAt: null };
  }
}

export async function setClientCache<T>(
  key: string,
  data: T,
  ttlSeconds: number,
): Promise<void> {
  const envelope: CacheEnvelope<T> = {
    v: CLIENT_CACHE_SCHEMA_VERSION,
    savedAt: Date.now(),
    ttlSeconds,
    data,
  };

  await writeCacheString(key, JSON.stringify(envelope));
}

export async function removeClientCache(key: string): Promise<void> {
  await deleteCacheKey(key);
}

/**
 * Removes every AsyncStorage entry under the `cache:` prefix.
 * Bookmarks, map UI prefs, and other Zustand persist keys are untouched.
 *
 * Dev: use the "Clear local cache" button on `/dev` or call this from the console.
 */
export async function clearAllClientCache(): Promise<void> {
  const keys = await getAllCacheKeys();
  await Promise.all(keys.map((key) => deleteCacheKey(key)));
}

export async function staleWhileRevalidate<T>(options: {
  key: string;
  ttlSeconds: number;
  fetcher: () => Promise<T>;
  force?: boolean;
  onCached?: (data: T, meta: { isFresh: boolean }) => void;
  onFetched?: (data: T) => void;
}): Promise<T> {
  const { key, ttlSeconds, fetcher, force, onCached, onFetched } = options;
  const cached = await getClientCache<T>(key);

  if (cached.data !== null) {
    onCached?.(cached.data, { isFresh: cached.isFresh });
  }

  if (cached.isFresh && !force) {
    return cached.data as T;
  }

  const fresh = await fetcher();
  await setClientCache(key, fresh, ttlSeconds);
  onFetched?.(fresh);
  return fresh;
}
