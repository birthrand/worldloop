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
import { fetchExploreRegionCountries } from "@/lib/explore-region-countries";
import { loadCountriesForDiscovery } from "@/lib/load-countries-for-discovery";
import { prefetchCountryProfiles } from "@/lib/prefetch-country-profiles";
import {
  prefetchFeedHeroImages,
  prefetchFeedHeroImagesAroundIndex,
  warmCountryHeroImage,
} from "@/lib/prefetch-feed-heroes";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";
import type { Country } from "@/types/country";
import type { DiscoveryScopeMode, GeoEntity } from "@/types/geo";

let regionFilterGeneration = 0;
let regionPrefetchGeneration = 0;
let hereFeedGeneration = 0;
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

function cancelRegionPrefetch(): void {
  regionPrefetchGeneration += 1;
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

async function ensureRegionCountries(region: string): Promise<Country[]> {
  const cached = useCountryFeedStore.getState().regionCache[region];
  if (cached !== undefined) {
    const filtered = filterCountriesForExploreRegion(cached, region);
    if (filtered.length > 0) return filtered;
  }

  const inFlight = regionFetchPromises.get(region);
  if (inFlight) return inFlight;

  const promise = (async () => {
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

      const { regionCache } = useCountryFeedStore.getState();
      if (regionCache[continent]) continue;

      try {
        const data = await ensureRegionCountries(continent);
        if (generation !== regionPrefetchGeneration) return;
        void prefetchFeedHeroImages(data.slice(0, 2));
      } catch {
        // Background prefetch — ignore failures.
      }
    }
  })();
}

export const useCountryFeedStore = create<CountryFeedState>((set, get) => ({
  countries: [],
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
      const prior = get();
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

      await prefetchFeedHeroImagesAroundIndex(
        payload.countries,
        prior.currentIndex,
      );
      if (isStale()) return;
      const { sortField, sortOrder } = get();
      const feedTail = sortCountries(payload.countries, sortField, sortOrder);
      const { countries, currentIndex } = mergeFetchedWithFocusedCountry(
        feedTail,
        prior.countries,
        prior.currentIndex,
        sortField,
        sortOrder,
      );
      set({
        countries,
        nextCursor: payload.nextCursor,
        currentIndex,
        discoveryMode: "forYou",
        selectedRegion: null,
        forYouSnapshot: { countries: feedTail, nextCursor: payload.nextCursor },
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImagesAroundIndex(countries, get().currentIndex);
      void prefetchCountryProfiles(countries, {
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

    if (region === null) {
      await get().restoreForYouFeed();
      return;
    }

    if (get().selectedRegion === region && get().status !== "error") return;

    snapshotForYouIfNeeded();

    const cached = get().regionCache[region];
    if (cached) {
      await prefetchFeedHeroImagesAroundIndex(cached, get().currentIndex);
      if (requestId !== regionFilterGeneration) return;
      const state = get();
      const { countries, currentIndex } = mergeFetchedWithFocusedCountry(
        cached,
        state.countries,
        state.currentIndex,
        state.sortField,
        state.sortOrder,
      );

      set({
        countries,
        nextCursor: null,
        currentIndex,
        discoveryMode: "region",
        selectedRegion: region,
        status: "idle",
        error: null,
      });
      void prefetchCountryProfiles(countries, { aroundIndex: currentIndex });
      prefetchRegionsSequentially(region);
      return;
    }

    set({
      discoveryMode: "region",
      selectedRegion: region,
      countries: [],
      currentIndex: 0,
      status: "loading",
      error: null,
    });

    try {
      const data = await ensureRegionCountries(region);
      if (requestId !== regionFilterGeneration) return;

      await prefetchFeedHeroImagesAroundIndex(data, get().currentIndex);
      if (requestId !== regionFilterGeneration) return;
      const state = get();
      const { countries, currentIndex } = mergeFetchedWithFocusedCountry(
        data,
        state.countries,
        state.currentIndex,
        state.sortField,
        state.sortOrder,
      );

      set({
        countries,
        nextCursor: null,
        currentIndex,
        discoveryMode: "region",
        selectedRegion: region,
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImagesAroundIndex(countries, 0);
      void prefetchCountryProfiles(countries, { aroundIndex: 0 });
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
      const { data, nextCursor: newCursor } = await fetchFeedCountries(
        nextCursor,
        limit,
      );
      const normalized = normalizeCountriesRegions(data);
      const { countries } = get();
      const existingNames = new Set(countries.map((c) => c.name));
      const uniqueNew = normalized.filter((c) => !existingNames.has(c.name));
      set((state) => {
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

        return {
          countries: nextCountries,
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
    const { countries } = get();
    if (countries.length === 0) {
      set({ currentIndex: 0 });
      return;
    }
    // Allow `countries.length` as a past-end sentinel for the "All caught up" deck state.
    const clamped = Math.max(0, Math.min(index, countries.length));
    set({ currentIndex: clamped });
  },

  loadHereFeed: async (entities, options) => {
    const requestId = ++hereFeedGeneration;
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

          set({
            countries: partial,
            currentIndex: resolveFocusIndex(partial),
            status: "idle",
            error: null,
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

      set({
        countries,
        currentIndex: resolveFocusIndex(countries),
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

  setDiscoveryMode: (mode) => {
    set({ discoveryMode: mode });
  },

  restoreForYouFeed: async () => {
    regionFilterGeneration += 1;
    hereFeedGeneration += 1;
    const restoreRegionGen = regionFilterGeneration;
    const restoreHereGen = hereFeedGeneration;

    useSpatialContextStore.setState((state) => ({
      discoveryScope: { ...state.discoveryScope, mode: "forYou" },
    }));

    const snapshot = get().forYouSnapshot;
    if (snapshot && snapshot.countries.length > 0) {
      await prefetchFeedHeroImagesAroundIndex(
        snapshot.countries,
        get().currentIndex,
      );
      if (isFeedGenerationStale(restoreRegionGen, restoreHereGen)) return;

      set({
        countries: snapshot.countries,
        nextCursor: snapshot.nextCursor,
        currentIndex: 0,
        discoveryMode: "forYou",
        selectedRegion: null,
        status: "idle",
        error: null,
      });
      prefetchRegionsSequentially(null);
      return;
    }

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
    cancelRegionPrefetch();
    regionFetchPromises.clear();
    set({
      countries: [],
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
