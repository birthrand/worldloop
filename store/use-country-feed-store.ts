import { create } from "zustand";

import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import { CONTINENTS } from "@/constants/regions";
import { fetchFeedCountries } from "@/lib/api";
import {
  filterCountriesForExploreRegion,
  normalizeCountriesRegions,
} from "@/lib/app-region";
import {
  getClientCache,
  setClientCache,
  staleWhileRevalidate,
} from "@/lib/client-cache";
import { usesLandmarkQueue } from "@/lib/explore-discovery-mode";
import { fetchExploreRegionCountries } from "@/lib/explore-region-countries";
import { loadCountriesForDiscovery } from "@/lib/load-countries-for-discovery";
import {
  clearPlacesFeedCaches,
  exitActivePlacesView,
  placesFeedCacheKey,
  resolvePlacesFeedForKey,
  switchPlacesCacheKey,
  tryBuildPlacesViewFromBase,
  warmPlacesBaseCache,
} from "@/lib/places-feed-cache";
import { prefetchCountryProfiles } from "@/lib/prefetch-country-profiles";
import {
  prefetchFeedHeroImages,
  prefetchFeedHeroImagesAroundIndex,
  warmCountryHeroImage,
} from "@/lib/prefetch-feed-heroes";
import {
  getStaticCountries,
  getStaticExploreRegionCountries,
  getStaticFeedPage,
  isStaticCountryCatalogEnabled,
  resetStaticFeedShuffle,
} from "@/lib/static-countries";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";
import type { Country } from "@/types/country";
import type { DiscoveryScopeMode, GeoEntity } from "@/types/geo";
import type { PlaceFeedItem } from "@/types/place-feed";

let regionFilterGeneration = 0;
let regionPrefetchGeneration = 0;
let hereFeedGeneration = 0;
let savedFeedGeneration = 0;
let savedLandmarksFeedGeneration = 0;
let placesFeedGeneration = 0;
const regionFetchPromises = new Map<string, Promise<Country[]>>();

const DEFAULT_LIMIT = 20;

type FeedStatus = "idle" | "loading" | "loadingMore" | "error";
export type FeedSortField = "name" | "population";
export type FeedSortOrder = "asc" | "desc" | "random";

export const DEFAULT_FEED_SORT_FIELD: FeedSortField = "name";
export const DEFAULT_FEED_SORT_ORDER: FeedSortOrder = "random";

type ForYouSnapshot = {
  countries: Country[];
  nextCursor: string | null;
};

type CountryFeedState = {
  countries: Country[];
  places: PlaceFeedItem[];
  nextCursor: string | null;
  currentIndex: number;
  /** Bumped when opening a country from search/home so Explore remounts at index 0. */
  focusEpoch: number;
  discoveryMode: DiscoveryScopeMode;
  selectedRegion: string | null;
  sortField: FeedSortField | null;
  sortOrder: FeedSortOrder | null;
  regionCache: Record<string, Country[]>;
  forYouSnapshot: ForYouSnapshot | null;
  status: FeedStatus;
  error: string | null;
  loadInitialFeed: (
    limit?: number,
    options?: {
      force?: boolean;
      feedGenerationGuard?: { regionGen: number; hereGen: number };
    },
  ) => Promise<void>;
  loadMoreFeed: (limit?: number) => Promise<void>;
  setRegionFilter: (region: string | null) => Promise<void>;
  setSort: (field: FeedSortField, order: FeedSortOrder) => void;
  clearSort: () => void;
  setCurrentIndex: (index: number) => void;
  focusCountryInFeed: (country: Country) => void;
  /** Focus by queue position without reordering the Here feed. */
  focusCountryInDiscoveryQueue: (countryName: string) => boolean;
  loadHereFeed: (
    entities: GeoEntity[],
    options?: { focusCountryName?: string },
  ) => Promise<void>;
  loadSavedFeed: () => Promise<void>;
  loadSavedLandmarksFeed: () => Promise<void>;
  loadPlacesFeed: (region?: string | null) => Promise<void>;
  setDiscoveryMode: (mode: DiscoveryScopeMode) => void;
  restoreForYouFeed: () => Promise<void>;
  getCurrentCountry: () => Country | undefined;
  resetFeed: () => void;
};

function isLoading(status: FeedStatus): boolean {
  return status === "loading" || status === "loadingMore";
}

function isFeedGenerationStale(regionGen: number, hereGen: number): boolean {
  return regionGen !== regionFilterGeneration || hereGen !== hereFeedGeneration;
}

function shuffleCountries<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function sortCountries(
  countries: Country[],
  sortField: FeedSortField | null,
  sortOrder: FeedSortOrder | null,
): Country[] {
  const field = sortField ?? DEFAULT_FEED_SORT_FIELD;
  const order = sortOrder ?? DEFAULT_FEED_SORT_ORDER;

  if (order === "random") {
    return shuffleCountries(countries);
  }

  const direction = order === "asc" ? 1 : -1;
  return [...countries].sort((a, b) => {
    if (field === "population") {
      return (a.population - b.population) * direction;
    }
    return a.name.localeCompare(b.name) * direction;
  });
}

function resolveFeedIndexForCountry(
  countries: Country[],
  countryName: string | undefined,
  fallback = 0,
): number {
  if (!countryName) return fallback;
  const index = countries.findIndex((country) => country.name === countryName);
  return index >= 0 ? index : fallback;
}

/** Keep search / deep-link focus when async feed or region loads finish. */
function mergeFetchedWithFocusedCountry(
  fetched: Country[],
  priorCountries: Country[],
  priorIndex: number,
  sortField: FeedSortField | null,
  sortOrder: FeedSortOrder | null,
): { countries: Country[]; currentIndex: number } {
  const sortedFetched = sortCountries(fetched, sortField, sortOrder);

  if (priorCountries.length === 0) {
    return { countries: sortedFetched, currentIndex: 0 };
  }

  const focused = priorCountries[priorIndex] ?? priorCountries[0];
  if (!focused) {
    return { countries: sortedFetched, currentIndex: 0 };
  }

  const focusedInFetched = sortedFetched.find((c) => c.name === focused.name);
  if (!focusedInFetched) {
    return { countries: sortedFetched, currentIndex: 0 };
  }

  const withoutFocused = sortedFetched.filter((c) => c.name !== focused.name);

  return {
    countries: [focusedInFetched, ...withoutFocused],
    currentIndex: 0,
  };
}

function resolveSavedCountriesForFeed(): Country[] {
  const { savedCountries, savedAtByName } = useSavedCountriesStore.getState();
  const sorted = [...savedCountries].sort((a, b) => {
    const aTime = savedAtByName[a.name] ?? 0;
    const bTime = savedAtByName[b.name] ?? 0;
    return bTime - aTime;
  });

  if (!isStaticCountryCatalogEnabled()) {
    return sorted;
  }

  const catalog = getStaticCountries();
  return sorted.map((country) => {
    const match = catalog.find((entry) => entry.name === country.name);
    return match ?? country;
  });
}

function cancelRegionPrefetch(): void {
  regionPrefetchGeneration += 1;
}

function resolveSavedLandmarksForFeed(): PlaceFeedItem[] {
  const { savedLandmarks, savedAtById } = useSavedLandmarksStore.getState();
  return [...savedLandmarks].sort((a, b) => {
    const aTime = savedAtById[a.landmark.id] ?? 0;
    const bTime = savedAtById[b.landmark.id] ?? 0;
    return bTime - aTime;
  });
}

function resolvePlacesCountryPool(): Country[] {
  const { forYouSnapshot, countries, discoveryMode } =
    useCountryFeedStore.getState();

  if (forYouSnapshot?.countries.length) {
    return forYouSnapshot.countries;
  }

  if (discoveryMode === "forYou" && countries.length > 0) {
    return countries;
  }

  if (isStaticCountryCatalogEnabled()) {
    const page = getStaticFeedPage(undefined, DEFAULT_LIMIT);
    return page.countries;
  }

  return countries;
}

function snapshotForYouIfNeeded(): void {
  const { forYouSnapshot, nextCursor, discoveryMode, countries } =
    useCountryFeedStore.getState();

  if (discoveryMode !== "forYou") return;
  if (forYouSnapshot) return;
  if (countries.length === 0) return;

  useCountryFeedStore.setState({
    forYouSnapshot: { countries, nextCursor },
  });
}

/** Sync pool for instant region tab switches — full cache, static catalog, or filtered subset. */
function resolveImmediateRegionCountries(region: string): Country[] {
  const state = useCountryFeedStore.getState();

  const cached = state.regionCache[region];
  if (cached !== undefined) {
    const filtered = filterCountriesForExploreRegion(cached, region);
    if (filtered.length > 0) return filtered;
  }

  if (isStaticCountryCatalogEnabled()) {
    return getStaticExploreRegionCountries(region);
  }

  const seen = new Set<string>();
  const merged: Country[] = [];

  const addPool = (pool: Country[]) => {
    for (const country of pool) {
      const key = country.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(country);
    }
  };

  if (state.forYouSnapshot?.countries.length) {
    addPool(state.forYouSnapshot.countries);
  }
  if (state.countries.length > 0) {
    addPool(state.countries);
  }

  if (merged.length === 0) return [];

  return filterCountriesForExploreRegion(merged, region);
}

function hasCompleteRegionList(region: string): boolean {
  const state = useCountryFeedStore.getState();
  const cached = state.regionCache[region];
  if (cached !== undefined) {
    return filterCountriesForExploreRegion(cached, region).length > 0;
  }

  return (
    isStaticCountryCatalogEnabled() &&
    getStaticExploreRegionCountries(region).length > 0
  );
}

async function ensureRegionCountries(region: string): Promise<Country[]> {
  const cached = useCountryFeedStore.getState().regionCache[region];
  if (cached !== undefined) {
    const filtered = filterCountriesForExploreRegion(cached, region);
    if (filtered.length > 0) return filtered;
  }

  const inFlight = regionFetchPromises.get(region);
  if (inFlight) return inFlight;

  const promise = (async () => {
    if (isStaticCountryCatalogEnabled()) {
      const countries = getStaticExploreRegionCountries(region);
      useCountryFeedStore.setState((state) => ({
        regionCache: { ...state.regionCache, [region]: countries },
      }));
      return countries;
    }

    const cacheKey = CLIENT_CACHE_KEYS.feedRegion(region);
    const diskCache = await getClientCache<Country[]>(cacheKey);

    if (diskCache.data) {
      useCountryFeedStore.setState((state) => ({
        regionCache: { ...state.regionCache, [region]: diskCache.data! },
      }));
      const filtered = filterCountriesForExploreRegion(diskCache.data, region);
      if (filtered.length > 0) {
        void staleWhileRevalidate({
          key: cacheKey,
          ttlSeconds: CLIENT_CACHE_TTL.feedRegion,
          fetcher: () => fetchExploreRegionCountries(region),
          onFetched: (countries) => {
            useCountryFeedStore.setState((state) => ({
              regionCache: { ...state.regionCache, [region]: countries },
            }));
          },
        }).catch(() => {
          // Background revalidate — keep showing cached region list.
        });
        return filtered;
      }
    }

    const countries = await fetchExploreRegionCountries(region);
    await setClientCache(cacheKey, countries, CLIENT_CACHE_TTL.feedRegion);
    useCountryFeedStore.setState((state) => ({
      regionCache: { ...state.regionCache, [region]: countries },
    }));
    return countries;
  })().finally(() => {
    regionFetchPromises.delete(region);
  });

  regionFetchPromises.set(region, promise);
  return promise;
}

function prefetchRegionsSequentially(excludeRegion?: string | null): void {
  const generation = ++regionPrefetchGeneration;

  void (async () => {
    for (const continent of CONTINENTS) {
      if (generation !== regionPrefetchGeneration) return;
      if (continent === excludeRegion) continue;

      try {
        const { regionCache } = useCountryFeedStore.getState();
        const data =
          regionCache[continent] ?? (await ensureRegionCountries(continent));
        if (generation !== regionPrefetchGeneration) return;

        void prefetchFeedHeroImages(data.slice(0, 2));
        void warmPlacesBaseCache(placesFeedCacheKey(continent, []), data);
      } catch {
        // Background prefetch — ignore failures.
      }
    }
  })();
}

export const useCountryFeedStore = create<CountryFeedState>((set, get) => ({
  countries: [],
  places: [],
  nextCursor: null,
  currentIndex: 0,
  focusEpoch: 0,
  discoveryMode: "forYou",
  selectedRegion: null,
  sortField: DEFAULT_FEED_SORT_FIELD,
  sortOrder: DEFAULT_FEED_SORT_ORDER,
  regionCache: {},
  forYouSnapshot: null,
  status: "idle",
  error: null,

  loadInitialFeed: async (limit = DEFAULT_LIMIT, options) => {
    if (!options?.force && get().countries.length > 0) return;
    if (!options?.force && isLoading(get().status)) return;

    const guard = options?.feedGenerationGuard;
    const isStale = () =>
      guard != null && isFeedGenerationStale(guard.regionGen, guard.hereGen);

    if (isStaticCountryCatalogEnabled()) {
      if (options?.force) {
        resetStaticFeedShuffle();
      }

      if (isStale()) return;

      const showBlockingLoad = get().countries.length === 0;
      if (showBlockingLoad) {
        set({ status: "loading", error: null });
      }

      try {
        const payload = getStaticFeedPage(undefined, limit);
        if (isStale()) return;

        const { sortField, sortOrder } = get();
        const feedTail = sortCountries(payload.countries, sortField, sortOrder);
        const viewingCountry = get().countries[get().currentIndex]?.name;
        const currentIndex = resolveFeedIndexForCountry(
          feedTail,
          viewingCountry,
          0,
        );

        await prefetchFeedHeroImagesAroundIndex(feedTail, currentIndex);
        if (isStale()) return;

        set({
          countries: feedTail,
          nextCursor: payload.nextCursor,
          currentIndex,
          discoveryMode: "forYou",
          selectedRegion: null,
          forYouSnapshot: {
            countries: feedTail,
            nextCursor: payload.nextCursor,
          },
          status: "idle",
          error: null,
        });
        void prefetchFeedHeroImagesAroundIndex(feedTail, get().currentIndex);
        void prefetchCountryProfiles(feedTail, {
          aroundIndex: get().currentIndex,
        });
        prefetchRegionsSequentially(null);
      } catch (err) {
        if (isStale()) return;
        set({
          status: "error",
          error:
            err instanceof Error ? err.message : "Failed to load country feed",
        });
      }
      return;
    }

    const cacheKey = CLIENT_CACHE_KEYS.feedFirstPage;
    let hydratedFromDisk = false;

    if (!options?.force && get().countries.length === 0) {
      const diskCache = await getClientCache<{
        countries: Country[];
        nextCursor: string | null;
      }>(cacheKey);

      if (diskCache.data) {
        if (isStale()) return;
        hydratedFromDisk = true;
        const normalized = normalizeCountriesRegions(diskCache.data.countries);
        const { sortField, sortOrder } = get();
        const feedTail = sortCountries(normalized, sortField, sortOrder);
        set({
          countries: feedTail,
          nextCursor: diskCache.data.nextCursor,
          currentIndex: 0,
          discoveryMode: "forYou",
          selectedRegion: null,
          forYouSnapshot: {
            countries: feedTail,
            nextCursor: diskCache.data.nextCursor,
          },
          status: "idle",
          error: null,
        });
      }
    }

    if (isStale()) return;

    const showBlockingLoad = get().countries.length === 0;
    if (showBlockingLoad) {
      set({ status: "loading", error: null });
    }

    try {
      const payload = await staleWhileRevalidate({
        key: cacheKey,
        ttlSeconds: CLIENT_CACHE_TTL.feedFirstPage,
        force: options?.force,
        fetcher: async () => {
          const { data, nextCursor } = await fetchFeedCountries(
            undefined,
            limit,
          );
          return {
            countries: normalizeCountriesRegions(data),
            nextCursor,
          };
        },
        onCached: (data) => {
          if (isStale()) return;
          if (hydratedFromDisk || get().countries.length > 0) return;
          const { sortField, sortOrder } = get();
          const feedTail = sortCountries(data.countries, sortField, sortOrder);
          set({
            countries: feedTail,
            nextCursor: data.nextCursor,
            currentIndex: 0,
            discoveryMode: "forYou",
            selectedRegion: null,
            forYouSnapshot: {
              countries: feedTail,
              nextCursor: data.nextCursor,
            },
            status: "idle",
            error: null,
          });
        },
      });

      if (isStale()) return;

      const state = get();
      const { sortField, sortOrder } = state;
      const feedTail = sortCountries(payload.countries, sortField, sortOrder);
      const viewingCountry = state.countries[state.currentIndex]?.name;

      // Background revalidation must not clobber a paginated feed or jump the deck.
      if (
        state.countries.length > feedTail.length &&
        state.discoveryMode === "forYou"
      ) {
        set({ status: "idle", error: null });
        return;
      }

      await prefetchFeedHeroImagesAroundIndex(
        feedTail,
        resolveFeedIndexForCountry(
          feedTail,
          viewingCountry,
          state.currentIndex,
        ),
      );
      if (isStale()) return;

      const currentIndex = resolveFeedIndexForCountry(
        feedTail,
        viewingCountry,
        0,
      );

      set({
        countries: feedTail,
        nextCursor: payload.nextCursor,
        currentIndex,
        discoveryMode: "forYou",
        selectedRegion: null,
        forYouSnapshot: { countries: feedTail, nextCursor: payload.nextCursor },
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImagesAroundIndex(feedTail, get().currentIndex);
      void prefetchCountryProfiles(feedTail, {
        aroundIndex: get().currentIndex,
      });
      prefetchRegionsSequentially(null);
    } catch (err) {
      if (isStale()) return;
      if (get().countries.length === 0) {
        set({
          status: "error",
          error:
            err instanceof Error ? err.message : "Failed to load country feed",
        });
      }
    }
  },

  setRegionFilter: async (region) => {
    const requestId = ++regionFilterGeneration;
    hereFeedGeneration += 1;
    savedFeedGeneration += 1;
    savedLandmarksFeedGeneration += 1;
    placesFeedGeneration += 1;
    exitActivePlacesView();

    if (region === null) {
      await get().restoreForYouFeed();
      return;
    }

    if (get().selectedRegion === region && get().status !== "error") return;

    snapshotForYouIfNeeded();

    const state = get();
    const immediate = resolveImmediateRegionCountries(region);
    const complete = hasCompleteRegionList(region);
    const { countries, currentIndex } =
      immediate.length > 0
        ? mergeFetchedWithFocusedCountry(
            immediate,
            state.countries,
            state.currentIndex,
            state.sortField,
            state.sortOrder,
          )
        : { countries: [] as Country[], currentIndex: 0 };

    set({
      countries,
      nextCursor: null,
      currentIndex,
      discoveryMode: "region",
      selectedRegion: region,
      status: complete || immediate.length > 0 ? "idle" : "loading",
      error: null,
    });

    if (countries.length > 0) {
      void prefetchFeedHeroImagesAroundIndex(countries, currentIndex);
      void prefetchCountryProfiles(countries, { aroundIndex: currentIndex });
    }

    if (complete) {
      if (
        isStaticCountryCatalogEnabled() &&
        get().regionCache[region] === undefined &&
        immediate.length > 0
      ) {
        set((next) => ({
          regionCache: { ...next.regionCache, [region]: immediate },
        }));
      }
      prefetchRegionsSequentially(region);
      return;
    }

    try {
      const data = await ensureRegionCountries(region);
      if (requestId !== regionFilterGeneration) return;

      const nextState = get();
      const merged = mergeFetchedWithFocusedCountry(
        data,
        nextState.countries,
        nextState.currentIndex,
        nextState.sortField,
        nextState.sortOrder,
      );

      set({
        countries: merged.countries,
        nextCursor: null,
        currentIndex: merged.currentIndex,
        discoveryMode: "region",
        selectedRegion: region,
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImagesAroundIndex(
        merged.countries,
        merged.currentIndex,
      );
      void prefetchCountryProfiles(merged.countries, {
        aroundIndex: merged.currentIndex,
      });
      prefetchRegionsSequentially(region);
    } catch (err) {
      if (requestId !== regionFilterGeneration) return;

      set({
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : `Failed to load countries in ${region}`,
      });
    }
  },

  loadMoreFeed: async (limit = DEFAULT_LIMIT) => {
    const { nextCursor, status, selectedRegion, discoveryMode } = get();
    if (
      selectedRegion !== null ||
      discoveryMode !== "forYou" ||
      nextCursor === null ||
      isLoading(status)
    ) {
      return;
    }

    set({ status: "loadingMore", error: null });

    try {
      const page = isStaticCountryCatalogEnabled()
        ? getStaticFeedPage(nextCursor, limit)
        : null;
      const batch = page
        ? { data: page.countries, nextCursor: page.nextCursor }
        : await fetchFeedCountries(nextCursor, limit);
      const { data, nextCursor: newCursor } = batch;
      const normalized = normalizeCountriesRegions(data);
      const { countries } = get();
      const existingNames = new Set(countries.map((c) => c.name));
      const uniqueNew = normalized.filter((c) => !existingNames.has(c.name));
      set((state) => {
        const viewingCountry = state.countries[state.currentIndex]?.name;
        const appended = [...state.countries, ...uniqueNew];
        const nextCountries =
          (state.sortOrder ?? DEFAULT_FEED_SORT_ORDER) === "random"
            ? appended
            : sortCountries(appended, state.sortField, state.sortOrder);
        const snapshotTail = state.forYouSnapshot
          ? sortCountries(
              [...state.forYouSnapshot.countries, ...uniqueNew],
              state.sortField,
              state.sortOrder,
            )
          : sortCountries(uniqueNew, state.sortField, state.sortOrder);
        const currentIndex = resolveFeedIndexForCountry(
          nextCountries,
          viewingCountry,
          state.currentIndex,
        );

        return {
          countries: nextCountries,
          currentIndex,
          nextCursor: newCursor,
          status: "idle",
          error: null,
          ...(state.selectedRegion === null
            ? {
                forYouSnapshot: {
                  countries: snapshotTail,
                  nextCursor: newCursor,
                },
              }
            : {}),
        };
      });
    } catch (err) {
      set({
        status: "error",
        error:
          err instanceof Error ? err.message : "Failed to load more countries",
      });
    }
  },

  setSort: (field, order) => {
    set((state) => {
      const sortedCountries = sortCountries(state.countries, field, order);
      return {
        sortField: field,
        sortOrder: order,
        countries: sortedCountries,
        currentIndex: 0,
        ...(state.forYouSnapshot
          ? {
              forYouSnapshot: {
                ...state.forYouSnapshot,
                countries: sortCountries(
                  state.forYouSnapshot.countries,
                  field,
                  order,
                ),
              },
            }
          : {}),
      };
    });
  },

  clearSort: () => {
    set((state) => {
      const sortedCountries = sortCountries(
        state.countries,
        DEFAULT_FEED_SORT_FIELD,
        DEFAULT_FEED_SORT_ORDER,
      );
      return {
        sortField: DEFAULT_FEED_SORT_FIELD,
        sortOrder: DEFAULT_FEED_SORT_ORDER,
        countries: sortedCountries,
        currentIndex: 0,
        ...(state.forYouSnapshot
          ? {
              forYouSnapshot: {
                ...state.forYouSnapshot,
                countries: sortCountries(
                  state.forYouSnapshot.countries,
                  DEFAULT_FEED_SORT_FIELD,
                  DEFAULT_FEED_SORT_ORDER,
                ),
              },
            }
          : {}),
      };
    });
  },

  setCurrentIndex: (index: number) => {
    const { countries, places, discoveryMode } = get();
    const queueLength = usesLandmarkQueue(discoveryMode)
      ? places.length
      : countries.length;

    if (queueLength === 0) {
      set({ currentIndex: 0 });
      return;
    }

    // Allow queue length as a past-end sentinel for the "All caught up" deck state.
    const clamped = Math.max(0, Math.min(index, queueLength));
    set({ currentIndex: clamped });
  },

  loadHereFeed: async (entities, options) => {
    const requestId = ++hereFeedGeneration;
    savedFeedGeneration += 1;
    savedLandmarksFeedGeneration += 1;
    placesFeedGeneration += 1;
    exitActivePlacesView();
    const { queue } = useSpatialContextStore.getState();
    const orderedEntities =
      queue.length > 0
        ? entities.slice().sort((a, b) => {
            const aIndex = queue.indexOf(a.name);
            const bIndex = queue.indexOf(b.name);
            const aRank = aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex;
            const bRank = bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex;
            return aRank - bRank;
          })
        : entities;

    snapshotForYouIfNeeded();

    set({
      discoveryMode: "here",
      selectedRegion: null,
      currentIndex: 0,
      nextCursor: null,
      status: "loading",
      error: null,
    });

    if (orderedEntities.length === 0) {
      set({
        countries: [],
        status: "error",
        error: "No countries in this map area",
      });
      return;
    }

    const resolveFocusIndex = (countries: Country[]) => {
      const focusName = options?.focusCountryName?.trim();
      if (!focusName) return 0;
      const index = countries.findIndex(
        (country) => country.name === focusName,
      );
      return index >= 0 ? index : 0;
    };

    try {
      const countries = await loadCountriesForDiscovery(orderedEntities, {
        onPartial: (partial) => {
          if (requestId !== hereFeedGeneration) return;
          if (partial.length === 0) return;

          set((state) => {
            const preserveSwipe =
              !options?.focusCountryName &&
              state.currentIndex > 0 &&
              state.countries.length > 0;
            const viewingCountry = preserveSwipe
              ? state.countries[state.currentIndex]?.name
              : undefined;

            return {
              countries: partial,
              currentIndex: resolveFeedIndexForCountry(
                partial,
                viewingCountry,
                resolveFocusIndex(partial),
              ),
              status: "idle",
              error: null,
            };
          });
          void prefetchFeedHeroImages(partial.slice(0, 2));
        },
      });

      if (requestId !== hereFeedGeneration) return;

      if (countries.length === 0) {
        set({
          countries: [],
          status: "error",
          error: "Could not load countries for this map area",
        });
        return;
      }

      await prefetchFeedHeroImagesAroundIndex(countries, get().currentIndex);
      if (requestId !== hereFeedGeneration) return;

      const finalState = get();
      const preserveSwipe =
        !options?.focusCountryName &&
        finalState.currentIndex > 0 &&
        finalState.countries.length > 0;
      const viewingCountry = preserveSwipe
        ? finalState.countries[finalState.currentIndex]?.name
        : undefined;

      set({
        countries,
        currentIndex: resolveFeedIndexForCountry(
          countries,
          viewingCountry,
          resolveFocusIndex(countries),
        ),
        discoveryMode: "here",
        selectedRegion: null,
        nextCursor: null,
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImagesAroundIndex(countries, get().currentIndex);
      void prefetchCountryProfiles(countries, {
        aroundIndex: get().currentIndex,
      });
    } catch (err) {
      if (requestId !== hereFeedGeneration) return;

      if (get().countries.length === 0) {
        set({
          status: "error",
          error:
            err instanceof Error
              ? err.message
              : "Failed to load countries for this map area",
        });
      } else {
        set({ status: "idle", error: null });
      }
    }
  },

  loadSavedFeed: async () => {
    const requestId = ++savedFeedGeneration;
    regionFilterGeneration += 1;
    hereFeedGeneration += 1;
    savedLandmarksFeedGeneration += 1;
    placesFeedGeneration += 1;
    exitActivePlacesView();

    snapshotForYouIfNeeded();

    const countries = resolveSavedCountriesForFeed();
    const state = get();
    const { countries: merged, currentIndex } = mergeFetchedWithFocusedCountry(
      countries,
      state.countries,
      state.currentIndex,
      null,
      "random",
    );

    if (countries.length === 0) {
      set({
        countries: [],
        places: [],
        currentIndex: 0,
        nextCursor: null,
        discoveryMode: "saved",
        selectedRegion: null,
        status: "idle",
        error: null,
      });
      return;
    }

    set({
      discoveryMode: "saved",
      selectedRegion: null,
      nextCursor: null,
      places: [],
      countries: merged.length > 0 ? merged : countries,
      currentIndex: merged.length > 0 ? currentIndex : 0,
      status: "loading",
      error: null,
    });

    try {
      const feed = merged.length > 0 ? merged : countries;
      await prefetchFeedHeroImagesAroundIndex(feed, get().currentIndex);
      if (requestId !== savedFeedGeneration) return;

      set({
        countries: feed,
        places: [],
        currentIndex: get().currentIndex,
        discoveryMode: "saved",
        selectedRegion: null,
        nextCursor: null,
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImagesAroundIndex(feed, get().currentIndex);
      void prefetchCountryProfiles(feed, { aroundIndex: get().currentIndex });
    } catch (err) {
      if (requestId !== savedFeedGeneration) return;

      set({
        status: "error",
        error:
          err instanceof Error ? err.message : "Failed to load saved countries",
      });
    }
  },

  loadSavedLandmarksFeed: async () => {
    const requestId = ++savedLandmarksFeedGeneration;
    regionFilterGeneration += 1;
    hereFeedGeneration += 1;
    savedFeedGeneration += 1;
    placesFeedGeneration += 1;
    exitActivePlacesView();

    snapshotForYouIfNeeded();

    const places = resolveSavedLandmarksForFeed();

    if (places.length === 0) {
      set({
        countries: [],
        places: [],
        currentIndex: 0,
        nextCursor: null,
        discoveryMode: "savedLandmarks",
        selectedRegion: null,
        status: "idle",
        error: null,
      });
      return;
    }

    set({
      discoveryMode: "savedLandmarks",
      selectedRegion: null,
      nextCursor: null,
      countries: [],
      places,
      currentIndex: 0,
      status: "idle",
      error: null,
    });

    if (requestId !== savedLandmarksFeedGeneration) return;

    void prefetchCountryProfiles(
      places.map((item) => item.country),
      { aroundIndex: 0 },
    );
  },

  loadPlacesFeed: async (region = null) => {
    const requestId = ++placesFeedGeneration;
    regionFilterGeneration += 1;
    hereFeedGeneration += 1;
    savedFeedGeneration += 1;
    savedLandmarksFeedGeneration += 1;

    if (
      region !== null &&
      get().selectedRegion === region &&
      get().discoveryMode === "places" &&
      get().status !== "error"
    ) {
      return;
    }

    snapshotForYouIfNeeded();

    set({
      discoveryMode: "places",
      selectedRegion: region,
      currentIndex: 0,
      nextCursor: null,
      error: null,
    });

    try {
      if (region !== null) {
        const regionKey = placesFeedCacheKey(region, []);
        switchPlacesCacheKey(regionKey);
        const instantPlaces = tryBuildPlacesViewFromBase(regionKey);
        if (instantPlaces !== null) {
          if (requestId !== placesFeedGeneration) return;
          set({ places: instantPlaces, status: "idle" });
          return;
        }
      }

      const countryPool =
        region !== null
          ? await ensureRegionCountries(region)
          : resolvePlacesCountryPool();
      if (requestId !== placesFeedGeneration) return;

      const cacheKey = placesFeedCacheKey(region, countryPool);
      switchPlacesCacheKey(cacheKey);

      const warmedPlaces = tryBuildPlacesViewFromBase(cacheKey);
      if (warmedPlaces !== null) {
        set({ places: warmedPlaces, status: "idle" });
        return;
      }

      const places = await resolvePlacesFeedForKey(cacheKey, countryPool);
      if (requestId !== placesFeedGeneration) return;

      set({ places, status: "idle" });
    } catch (err) {
      if (requestId !== placesFeedGeneration) return;

      set({
        places: [],
        selectedRegion: region,
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : region
              ? `Failed to load landmarks in ${region}`
              : "Failed to load landmarks feed",
      });
    }
  },

  setDiscoveryMode: (mode) => {
    set({ discoveryMode: mode });
  },

  restoreForYouFeed: async () => {
    regionFilterGeneration += 1;
    hereFeedGeneration += 1;
    savedFeedGeneration += 1;
    savedLandmarksFeedGeneration += 1;
    placesFeedGeneration += 1;
    exitActivePlacesView();
    const restoreRegionGen = regionFilterGeneration;
    const restoreHereGen = hereFeedGeneration;

    useSpatialContextStore.setState((state) => ({
      discoveryScope: { ...state.discoveryScope, mode: "forYou" },
    }));

    const snapshot = get().forYouSnapshot;
    if (snapshot && snapshot.countries.length > 0) {
      set({
        countries: snapshot.countries,
        places: [],
        nextCursor: snapshot.nextCursor,
        currentIndex: 0,
        discoveryMode: "forYou",
        selectedRegion: null,
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImagesAroundIndex(snapshot.countries, 0);
      prefetchRegionsSequentially(null);
      return;
    }

    set({ status: "loading", error: null });

    if (isFeedGenerationStale(restoreRegionGen, restoreHereGen)) return;

    set({
      discoveryMode: "forYou",
      selectedRegion: null,
      error: null,
    });
    await get().loadInitialFeed(undefined, {
      force: true,
      feedGenerationGuard: {
        regionGen: restoreRegionGen,
        hereGen: restoreHereGen,
      },
    });
  },

  focusCountryInFeed: (country: Country) => {
    warmCountryHeroImage(country);

    const { forYouSnapshot, nextCursor, status, focusEpoch } = get();
    const nextStatus = status === "loading" ? "idle" : status;

    if (!forYouSnapshot || forYouSnapshot.countries.length === 0) {
      const countries = [country];
      set({
        countries,
        currentIndex: 0,
        focusEpoch: focusEpoch + 1,
        status: nextStatus,
      });
      void prefetchCountryProfiles(countries, { aroundIndex: 0 });
      void get().loadInitialFeed(undefined, { force: true });
      return;
    }

    const tail = forYouSnapshot.countries.filter(
      (c) => c.name !== country.name,
    );
    const countries = [country, ...tail];

    set({
      countries,
      currentIndex: 0,
      focusEpoch: focusEpoch + 1,
      nextCursor: forYouSnapshot.nextCursor ?? nextCursor,
      status: nextStatus,
    });
    void prefetchCountryProfiles(countries, { aroundIndex: 0 });
  },

  focusCountryInDiscoveryQueue: (countryName) => {
    const { countries, discoveryMode, focusEpoch } = get();
    if (discoveryMode !== "here" || countries.length === 0) {
      return false;
    }

    const feedIndex = countries.findIndex(
      (country) => country.name === countryName,
    );
    if (feedIndex < 0) {
      return false;
    }

    set({
      currentIndex: feedIndex,
      focusEpoch: focusEpoch + 1,
    });
    warmCountryHeroImage(countries[feedIndex]!);
    void prefetchCountryProfiles(countries, { aroundIndex: feedIndex });
    return true;
  },

  getCurrentCountry: () => {
    const { countries, currentIndex } = get();
    return countries[currentIndex];
  },

  resetFeed: () => {
    regionFilterGeneration += 1;
    hereFeedGeneration += 1;
    savedFeedGeneration += 1;
    savedLandmarksFeedGeneration += 1;
    placesFeedGeneration += 1;
    cancelRegionPrefetch();
    regionFetchPromises.clear();
    clearPlacesFeedCaches();
    set({
      countries: [],
      places: [],
      nextCursor: null,
      currentIndex: 0,
      focusEpoch: 0,
      discoveryMode: "forYou",
      selectedRegion: null,
      sortField: DEFAULT_FEED_SORT_FIELD,
      sortOrder: DEFAULT_FEED_SORT_ORDER,
      regionCache: {},
      forYouSnapshot: null,
      status: "idle",
      error: null,
    });
  },
}));
