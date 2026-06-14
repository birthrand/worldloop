import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import { fetchSearchCountries } from "@/lib/api";
import {
  filterCountriesForExploreRegion,
  isSplitAmericasRegion,
} from "@/lib/app-region";
import { getClientCache, staleWhileRevalidate } from "@/lib/client-cache";
import { fetchExploreRegionCountries } from "@/lib/explore-region-countries";
import { mapCountryToCountry } from "@/lib/map-country";
import {
  getStaticCountries,
  isStaticCountryCatalogEnabled,
} from "@/lib/static-countries";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useMapStore } from "@/store/use-map-store";
import type { Country, MapCountry } from "@/types/country";

let diskCatalogSnapshot: Country[] = [];
let baseDiskHydrated = false;
let baseDiskHydratePromise: Promise<void> | null = null;
const hydratedDiskRegions = new Set<string>();
const regionDiskHydratePromises = new Map<string, Promise<void>>();

function countryRichness(country: Country): number {
  let score = 0;
  if (country.ai) score += 4;
  if (country.images?.length) score += 2;
  if (country.subregion) score += 1;
  return score;
}

function mergeCatalog(sources: Country[][]): Country[] {
  const byName = new Map<string, Country>();

  for (const list of sources) {
    for (const country of list) {
      const key = country.name.toLowerCase();
      const existing = byName.get(key);
      if (!existing || countryRichness(country) > countryRichness(existing)) {
        byName.set(key, country);
      }
    }
  }

  return [...byName.values()];
}

function getMemoryCatalog(): Country[] {
  if (isStaticCountryCatalogEnabled()) {
    return getStaticCountries();
  }

  const sources: Country[][] = [];

  const mapCountries = useMapStore.getState().countries;
  if (mapCountries.length > 0) {
    sources.push(mapCountries.map((country) => mapCountryToCountry(country)));
  }

  const feedState = useCountryFeedStore.getState();
  if (feedState.countries.length > 0) {
    sources.push(feedState.countries);
  }

  for (const regionCountries of Object.values(feedState.regionCache)) {
    if (regionCountries.length > 0) {
      sources.push(regionCountries);
    }
  }

  return mergeCatalog(sources);
}

async function loadDiskCatalog(region: string): Promise<Country[]> {
  const [mapDisk, feedDisk, regionDisk] = await Promise.all([
    getClientCache<MapCountry[]>(CLIENT_CACHE_KEYS.mapCountries),
    getClientCache<{ countries: Country[]; nextCursor: string | null }>(
      CLIENT_CACHE_KEYS.feedFirstPage,
    ),
    region
      ? getClientCache<Country[]>(CLIENT_CACHE_KEYS.feedRegion(region))
      : Promise.resolve({
          data: null,
          isFresh: false,
          isStale: false,
          savedAt: null,
        }),
  ]);

  const sources: Country[][] = [];

  if (mapDisk.data && mapDisk.data.length > 0) {
    sources.push(mapDisk.data.map((country) => mapCountryToCountry(country)));
  }

  if (feedDisk.data?.countries && feedDisk.data.countries.length > 0) {
    sources.push(feedDisk.data.countries);
  }

  if (regionDisk.data && regionDisk.data.length > 0) {
    sources.push(regionDisk.data);
  }

  return mergeCatalog(sources);
}

function getMergedLocalCatalog(): Country[] {
  return mergeCatalog([getMemoryCatalog(), diskCatalogSnapshot]);
}

function filterLocalCatalog(
  catalog: Country[],
  query: string,
  region: string,
): Country[] {
  const q = query.trim();
  const r = region.trim();

  let matches = catalog;
  if (r) {
    matches = filterCountriesForExploreRegion(matches, r);
  }
  if (q) {
    return filterByQuery(matches, q);
  }

  return sortByName(matches);
}

/** True when feed/map/region data is available for instant local name filtering. */
export function hasLocalSearchCatalog(): boolean {
  return getMergedLocalCatalog().length > 0;
}

/** Synchronous filter against in-memory + hydrated disk catalog (no network). */
export function getSyncLocalSearchResults(
  query: string,
  region: string,
): Country[] {
  const catalog = getMergedLocalCatalog();
  if (catalog.length === 0) return [];
  return filterLocalCatalog(catalog, query, region);
}

async function hydrateBaseDiskCatalog(): Promise<void> {
  if (baseDiskHydrated) return;

  if (isStaticCountryCatalogEnabled()) {
    diskCatalogSnapshot = getStaticCountries();
    baseDiskHydrated = true;
    return;
  }

  if (baseDiskHydratePromise) {
    await baseDiskHydratePromise;
    return;
  }

  baseDiskHydratePromise = (async () => {
    const diskCatalog = await loadDiskCatalog("");
    if (diskCatalog.length > 0) {
      diskCatalogSnapshot = mergeCatalog([diskCatalogSnapshot, diskCatalog]);
    }
    baseDiskHydrated = true;
  })().catch((err) => {
    baseDiskHydratePromise = null;
    throw err;
  });

  await baseDiskHydratePromise;
}

async function hydrateRegionDiskCatalog(region: string): Promise<void> {
  const trimmedRegion = region.trim();
  if (!trimmedRegion || hydratedDiskRegions.has(trimmedRegion)) return;

  const inFlight = regionDiskHydratePromises.get(trimmedRegion);
  if (inFlight) {
    await inFlight;
    return;
  }

  const promise = (async () => {
    await hydrateBaseDiskCatalog();

    const regionDisk = await getClientCache<Country[]>(
      CLIENT_CACHE_KEYS.feedRegion(trimmedRegion),
    );
    if (regionDisk.data && regionDisk.data.length > 0) {
      diskCatalogSnapshot = mergeCatalog([
        diskCatalogSnapshot,
        regionDisk.data,
      ]);
    }

    hydratedDiskRegions.add(trimmedRegion);
  })().catch((err) => {
    regionDiskHydratePromises.delete(trimmedRegion);
    throw err;
  });

  regionDiskHydratePromises.set(trimmedRegion, promise);
  await promise;
}

async function hydrateDiskCatalog(region: string): Promise<void> {
  await hydrateBaseDiskCatalog();
  await hydrateRegionDiskCatalog(region.trim());
}

/** Warm map/feed disk caches so progressive typing can filter without network. */
export function prefetchLocalSearchCatalog(region = ""): void {
  void hydrateDiskCatalog(region.trim());
}

async function getLocalSearchResults(
  query: string,
  region: string,
): Promise<Country[] | null> {
  await hydrateDiskCatalog(region.trim());
  const results = getSyncLocalSearchResults(query, region);
  return results.length > 0 ? results : null;
}

const SUBSTRING_MIN_LEN = 3;

function rankSearchMatch(name: string, query: string): number | null {
  const normalizedName = name.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  if (normalizedName.startsWith(q)) return 0;
  if (q.length >= SUBSTRING_MIN_LEN && normalizedName.includes(q)) return 1;
  return null;
}

function filterByQuery<T extends { name: string }>(
  countries: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return countries;

  return countries
    .map((country) => ({
      country,
      rank: rankSearchMatch(country.name, q),
    }))
    .filter(
      (entry): entry is { country: T; rank: number } => entry.rank !== null,
    )
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.country.name.localeCompare(b.country.name);
    })
    .map((entry) => entry.country);
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

  if (isStaticCountryCatalogEnabled()) {
    const { searchStaticCountries } = await import("@/lib/static-countries");
    return searchStaticCountries(q || undefined, r || undefined);
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
    return filterByQuery(regionCountries, q);
  }

  const { data } = await fetchSearchCountries(q, r);
  if (data.length > 0) return data;

  const regionCountries = await fetchExploreRegionCountries(r);
  return filterByQuery(regionCountries, q);
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

  const local = await getLocalSearchResults(query, region);
  if (local) return local;

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
