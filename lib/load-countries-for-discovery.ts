import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import { fetchCountryByName } from "@/lib/api";
import {
  getClientCache,
  setClientCache,
  staleWhileRevalidate,
} from "@/lib/client-cache";
import {
  getStaticCountryByName,
  isStaticCountryCatalogEnabled,
} from "@/lib/static-countries";
import type { Country } from "@/types/country";
import type { GeoEntity } from "@/types/geo";

/** Max countries in a viewport-driven Here feed (local pagination cap). */
export const HERE_FEED_PAGE_SIZE = 30;

function dedupeEntities(entities: GeoEntity[]): GeoEntity[] {
  const seen = new Set<string>();
  const result: GeoEntity[] = [];

  for (const entity of entities) {
    const key = entity.cca2.trim() || entity.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entity);
  }

  return result;
}

function orderCountriesByEntities(
  countries: Country[],
  entities: GeoEntity[],
): Country[] {
  const rank = new Map<string, number>();
  entities.forEach((entity, index) => {
    rank.set(entity.name, index);
  });

  return [...countries].sort(
    (a, b) => (rank.get(a.name) ?? 9999) - (rank.get(b.name) ?? 9999),
  );
}

async function readCachedCountry(name: string): Promise<Country | null> {
  if (isStaticCountryCatalogEnabled()) {
    return getStaticCountryByName(name);
  }

  const cacheKey = CLIENT_CACHE_KEYS.countryDetail(name);
  const diskCache = await getClientCache<Country>(cacheKey);
  return diskCache.data;
}

async function fetchCountryCached(name: string): Promise<Country | null> {
  if (isStaticCountryCatalogEnabled()) {
    return getStaticCountryByName(name);
  }

  const cacheKey = CLIENT_CACHE_KEYS.countryDetail(name);

  try {
    return await staleWhileRevalidate({
      key: cacheKey,
      ttlSeconds: CLIENT_CACHE_TTL.countryDetail,
      fetcher: () => fetchCountryByName(name),
    });
  } catch {
    return null;
  }
}

function revalidateCountryInBackground(name: string): void {
  if (isStaticCountryCatalogEnabled()) return;

  const cacheKey = CLIENT_CACHE_KEYS.countryDetail(name);
  void staleWhileRevalidate({
    key: cacheKey,
    ttlSeconds: CLIENT_CACHE_TTL.countryDetail,
    fetcher: () => fetchCountryByName(name),
    onFetched: (country) => {
      void setClientCache(cacheKey, country, CLIENT_CACHE_TTL.countryDetail);
    },
  }).catch(() => {
    // Background refresh — keep showing cached detail.
  });
}

export type LoadCountriesForDiscoveryOptions = {
  limit?: number;
  onPartial?: (countries: Country[]) => void;
};

/**
 * Resolve viewport `GeoEntity[]` into enriched `Country[]`, preserving spatial rank.
 * Shows cached countries immediately; fetches missing details in parallel.
 */
export async function loadCountriesForDiscovery(
  entities: GeoEntity[],
  options?: LoadCountriesForDiscoveryOptions,
): Promise<Country[]> {
  const deduped = dedupeEntities(entities);
  const limit = options?.limit ?? HERE_FEED_PAGE_SIZE;
  const batch = deduped.slice(0, limit);

  if (batch.length === 0) return [];

  const resolvedByName = new Map<string, Country>();

  const cached = await Promise.all(
    batch.map(async (entity) => ({
      entity,
      country: await readCachedCountry(entity.name),
    })),
  );

  for (const { entity, country } of cached) {
    if (country) {
      resolvedByName.set(entity.name, country);
      revalidateCountryInBackground(entity.name);
    }
  }

  const emitPartial = () => {
    options?.onPartial?.(
      orderCountriesByEntities([...resolvedByName.values()], batch),
    );
  };

  if (resolvedByName.size > 0) {
    emitPartial();
  }

  const missing = batch.filter((entity) => !resolvedByName.has(entity.name));

  await Promise.all(
    missing.map(async (entity) => {
      const country = await fetchCountryCached(entity.name);
      if (!country) return;
      resolvedByName.set(entity.name, country);
      emitPartial();
    }),
  );

  return orderCountriesByEntities([...resolvedByName.values()], batch);
}

/** Fast check used before navigating to Explore — any cached detail in viewport? */
export async function hasCachedCountryInViewport(
  entities: GeoEntity[],
): Promise<boolean> {
  const deduped = dedupeEntities(entities).slice(0, HERE_FEED_PAGE_SIZE);
  if (deduped.length === 0) return false;

  try {
    await Promise.any(
      deduped.map(async (entity) => {
        const cached = await readCachedCountry(entity.name);
        if (cached) return cached;
        throw new Error("cache miss");
      }),
    );
    return true;
  } catch {
    return false;
  }
}
