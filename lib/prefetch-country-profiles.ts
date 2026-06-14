import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import { fetchCountryProfile } from "@/lib/api";
import { staleWhileRevalidate } from "@/lib/client-cache";
import {
  getCachedCountryProfile,
  hydrateCountryProfileFromDisk,
  isCountryProfileEnriched,
  seedStaticCountryProfileIfAvailable,
  setCachedCountryProfile,
  type CachedCountryProfile,
} from "@/lib/country-profile-cache";
import {
  isStaticCountryProfileCatalogEnabled,
  isStaticCountryProfileEnriched,
} from "@/lib/static-country-profiles";
import type { Country } from "@/types/country";

const PREFETCH_AHEAD = 2;
const PREFETCH_BEHIND = 1;
const FEED_INITIAL_PREFETCH = 4;
const DEFAULT_READY_WAIT_MS = 450;

const inFlight = new Map<string, Promise<void>>();

function profileKey(name: string): string {
  return name.trim().toLowerCase();
}

function shouldFetchCountryProfile(name: string): boolean {
  if (
    isStaticCountryProfileCatalogEnabled() &&
    isStaticCountryProfileEnriched(name)
  ) {
    return false;
  }

  return !isCountryProfileEnriched(getCachedCountryProfile(name), name);
}

async function fetchAndCacheProfile(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  await hydrateCountryProfileFromDisk(trimmed);
  seedStaticCountryProfileIfAvailable(trimmed);

  const cachedProfile = getCachedCountryProfile(trimmed);
  if (!shouldFetchCountryProfile(trimmed)) {
    return;
  }

  await staleWhileRevalidate({
    key: CLIENT_CACHE_KEYS.countryProfile(trimmed),
    ttlSeconds: CLIENT_CACHE_TTL.countryProfile,
    force: !isCountryProfileEnriched(cachedProfile, trimmed),
    fetcher: async () => {
      const data = await fetchCountryProfile(trimmed);
      const profile: CachedCountryProfile = {
        country: data.country,
        wikipedia: data.wikipedia ?? null,
        landmarks: data.landmarks ?? [],
      };
      return setCachedCountryProfile(trimmed, profile);
    },
    onCached: (profile) => {
      if (
        !isCountryProfileEnriched(getCachedCountryProfile(trimmed), trimmed)
      ) {
        setCachedCountryProfile(trimmed, profile);
      }
    },
    onFetched: (profile) => {
      setCachedCountryProfile(trimmed, profile);
    },
  });
}

/**
 * Warm full country explorer data (country, Wikipedia, landmarks).
 * Uses memory + AsyncStorage; dedupes in-flight fetches.
 */
export function prefetchCountryProfile(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return Promise.resolve();

  const key = profileKey(trimmed);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const task = fetchAndCacheProfile(trimmed)
    .catch(() => {
      // Background prefetch — per-country failures are non-fatal.
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, task);
  return task;
}

/** Touch / hover — hydrate disk and start fetch without blocking navigation. */
export function warmCountryProfileOnInteraction(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  void hydrateCountryProfileFromDisk(trimmed);
  void prefetchCountryProfile(trimmed);
}

/**
 * Wait briefly for overview + landmarks before opening the explorer.
 * Returns the best cached profile available (memory or disk).
 */
export async function ensureCountryProfileReady(
  name: string,
  options?: { maxWaitMs?: number },
): Promise<CachedCountryProfile | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  await hydrateCountryProfileFromDisk(trimmed);

  let cached = getCachedCountryProfile(trimmed);
  if (isCountryProfileEnriched(cached, trimmed)) {
    return cached ?? null;
  }

  seedStaticCountryProfileIfAvailable(trimmed);
  cached = getCachedCountryProfile(trimmed);
  if (isCountryProfileEnriched(cached, trimmed)) {
    return cached ?? null;
  }

  const maxWaitMs = options?.maxWaitMs ?? DEFAULT_READY_WAIT_MS;
  const prefetch = prefetchCountryProfile(trimmed);

  if (maxWaitMs > 0) {
    await Promise.race([
      prefetch,
      new Promise<void>((resolve) => {
        setTimeout(resolve, maxWaitMs);
      }),
    ]);
  } else {
    void prefetch;
  }

  cached = getCachedCountryProfile(trimmed);
  return cached ?? null;
}

function pickPrefetchTargets(
  countries: Country[],
  aroundIndex?: number,
): Country[] {
  const seen = new Set<string>();
  const targets: Country[] = [];

  const add = (country: Country | undefined) => {
    if (!country) return;
    const key = profileKey(country.name);
    if (seen.has(key)) return;
    seen.add(key);
    targets.push(country);
  };

  if (typeof aroundIndex === "number" && countries.length > 0) {
    const start = Math.max(0, aroundIndex - PREFETCH_BEHIND);
    const end = Math.min(countries.length - 1, aroundIndex + PREFETCH_AHEAD);
    for (let index = start; index <= end; index += 1) {
      add(countries[index]);
    }
  }

  for (
    let index = 0;
    index < FEED_INITIAL_PREFETCH && index < countries.length;
    index += 1
  ) {
    add(countries[index]);
  }

  return targets;
}

/** Sequential background prefetch — avoids hammering Wikipedia on the backend. */
export async function prefetchCountryProfiles(
  countries: Country[],
  options?: { aroundIndex?: number },
): Promise<void> {
  const targets = pickPrefetchTargets(countries, options?.aroundIndex);
  for (const country of targets) {
    await prefetchCountryProfile(country.name);
  }
}
