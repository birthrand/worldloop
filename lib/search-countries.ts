import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import { fetchSearchCountries } from "@/lib/api";
import {
  filterCountriesForExploreRegion,
  isSplitAmericasRegion,
} from "@/lib/app-region";
import { getClientCache, staleWhileRevalidate } from "@/lib/client-cache";
import { fetchExploreRegionCountries } from "@/lib/explore-region-countries";
import type { Country } from "@/types/country";

function filterByQuery(countries: Country[], query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return countries;
  return countries.filter((c) => c.name.toLowerCase().includes(q));
}

function sortByName(countries: Country[]): Country[] {
  return [...countries].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolves search results with app continent ids (North/South America)
 * and legacy `Americas` payloads — same rules as Explore region tabs.
 */
export async function fetchSearchCountriesResolved(
  query?: string,
  region?: string,
): Promise<Country[]> {
  const q = query?.trim() ?? "";
  const r = region?.trim() ?? "";

  if (!q && !r) {
    throw new Error("At least one of query or region is required");
  }

  if (!q && r) {
    return fetchExploreRegionCountries(r);
  }

  if (q && !r) {
    const { data } = await fetchSearchCountries(q);
    return data;
  }

  if (isSplitAmericasRegion(r)) {
    const regionCountries = await fetchExploreRegionCountries(r);
    return sortByName(filterByQuery(regionCountries, q));
  }

  const { data } = await fetchSearchCountries(q, r);
  if (data.length > 0) return data;

  const regionCountries = await fetchExploreRegionCountries(r);
  return sortByName(filterByQuery(regionCountries, q));
}

/** Disk cache for a search query — includes feed region cache for region-only filters. */
export async function getCachedSearchResults(
  query: string,
  region: string,
): Promise<Country[] | null> {
  return readHydratedSearchCache(query, region);
}

async function readHydratedSearchCache(
  query: string,
  region: string,
): Promise<Country[] | null> {
  const cacheKey = CLIENT_CACHE_KEYS.search(query, region);
  const diskCache = await getClientCache<Country[]>(cacheKey);
  if (diskCache.data && diskCache.data.length > 0) {
    return diskCache.data;
  }

  if (!query && region) {
    const feedRegionKey = CLIENT_CACHE_KEYS.feedRegion(region);
    const feedRegionDisk = await getClientCache<Country[]>(feedRegionKey);
    if (feedRegionDisk.data) {
      const filtered = filterCountriesForExploreRegion(
        feedRegionDisk.data,
        region,
      );
      if (filtered.length > 0) return filtered;
    }
  }

  return null;
}

export async function searchCountriesWithCache(
  query: string,
  region: string,
  options?: {
    force?: boolean;
    onCached?: (countries: Country[]) => void;
    onFetched?: (countries: Country[]) => void;
  },
): Promise<Country[]> {
  const q = query.trim();
  const r = region.trim();
  const cacheKey = CLIENT_CACHE_KEYS.search(q, r);
  const hydrated = options?.force ? null : await readHydratedSearchCache(q, r);

  if (hydrated) {
    options?.onCached?.(hydrated);
  }

  try {
    return await staleWhileRevalidate({
      key: cacheKey,
      ttlSeconds: CLIENT_CACHE_TTL.search,
      force: options?.force,
      fetcher: () =>
        fetchSearchCountriesResolved(q || undefined, r || undefined),
      onCached: (data) => {
        if (!hydrated) options?.onCached?.(data);
      },
      onFetched: options?.onFetched,
    });
  } catch (err) {
    if (hydrated) return hydrated;

    const fallback = await readHydratedSearchCache(q, r);
    if (fallback) return fallback;

    throw err;
  }
}
