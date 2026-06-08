import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import { fetchCountryProfile } from "@/lib/api";
import { staleWhileRevalidate } from "@/lib/client-cache";
import {
  getCachedCountryProfile,
  hydrateCountryProfileFromDisk,
  isCountryProfileEnriched,
  setCachedCountryProfile,
  type CachedCountryProfile,
} from "@/lib/country-profile-cache";
import type { Country } from "@/types/country";

const PREFETCH_AHEAD = 2;
const PREFETCH_BEHIND = 1;
const FEED_INITIAL_PREFETCH = 4;

const inFlight = new Map<string, Promise<void>>();

function profileKey(name: string): string {
  return name.trim().toLowerCase();
}

async function fetchAndCacheProfile(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  await hydrateCountryProfileFromDisk(trimmed);

  if (isCountryProfileEnriched(getCachedCountryProfile(trimmed))) {
    return;
  }

  await staleWhileRevalidate({
    key: CLIENT_CACHE_KEYS.countryProfile(trimmed),
    ttlSeconds: CLIENT_CACHE_TTL.countryProfile,
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
      if (!isCountryProfileEnriched(getCachedCountryProfile(trimmed))) {
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

  for (let index = 0; index < FEED_INITIAL_PREFETCH && index < countries.length; index += 1) {
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
