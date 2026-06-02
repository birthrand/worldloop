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
import { prefetchFeedHeroImages } from "@/lib/prefetch-feed-heroes";
import type { Country } from "@/types/country";

let regionFilterGeneration = 0;
let regionPrefetchGeneration = 0;
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
  selectedRegion: string | null;
  sortField: FeedSortField | null;
  sortOrder: FeedSortOrder | null;
  regionCache: Record<string, Country[]>;
  forYouSnapshot: ForYouSnapshot | null;
  status: FeedStatus;
  error: string | null;
  loadInitialFeed: (
    limit?: number,
    options?: { force?: boolean },
  ) => Promise<void>;
  loadMoreFeed: (limit?: number) => Promise<void>;
  setRegionFilter: (region: string | null) => Promise<void>;
  setSort: (field: FeedSortField, order: FeedSortOrder) => void;
  clearSort: () => void;
  setCurrentIndex: (index: number) => void;
  focusCountryInFeed: (country: Country) => void;
  getCurrentCountry: () => Country | undefined;
  resetFeed: () => void;
};

function isLoading(status: FeedStatus): boolean {
  return status === "loading" || status === "loadingMore";
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

    const cacheKey = CLIENT_CACHE_KEYS.feedFirstPage;
    let hydratedFromDisk = false;

    if (!options?.force && get().countries.length === 0) {
      const diskCache = await getClientCache<{
        countries: Country[];
        nextCursor: string | null;
      }>(cacheKey);

      if (diskCache.data) {
        hydratedFromDisk = true;
        const normalized = normalizeCountriesRegions(diskCache.data.countries);
        const { sortField, sortOrder } = get();
        const feedTail = sortCountries(normalized, sortField, sortOrder);
        set({
          countries: feedTail,
          nextCursor: diskCache.data.nextCursor,
          currentIndex: 0,
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
          if (hydratedFromDisk || get().countries.length > 0) return;
          const { sortField, sortOrder } = get();
          const feedTail = sortCountries(data.countries, sortField, sortOrder);
          set({
            countries: feedTail,
            nextCursor: data.nextCursor,
            currentIndex: 0,
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

      await prefetchFeedHeroImages(payload.countries);
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
        selectedRegion: null,
        forYouSnapshot: { countries: feedTail, nextCursor: payload.nextCursor },
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImages(countries.slice(1, 3));
      prefetchRegionsSequentially(null);
    } catch (err) {
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

    if (region === null) {
      const snapshot = get().forYouSnapshot;
      if (snapshot && snapshot.countries.length > 0) {
        await prefetchFeedHeroImages(snapshot.countries);
        if (requestId !== regionFilterGeneration) return;
        const { sortField, sortOrder } = get();

        set({
          countries: sortCountries(snapshot.countries, sortField, sortOrder),
          nextCursor: snapshot.nextCursor,
          currentIndex: 0,
          selectedRegion: null,
          status: "idle",
          error: null,
        });
        prefetchRegionsSequentially(null);
        return;
      }

      set({ selectedRegion: null, error: null });
      await get().loadInitialFeed(undefined, { force: true });
      return;
    }

    if (get().selectedRegion === region && get().status !== "error") return;

    if (get().selectedRegion === null) {
      const { forYouSnapshot, nextCursor } = get();
      if (forYouSnapshot) {
        set({ forYouSnapshot: { ...forYouSnapshot, nextCursor } });
      } else if (get().countries.length > 0) {
        set({
          forYouSnapshot: { countries: get().countries, nextCursor },
        });
      }
    }

    const cached = get().regionCache[region];
    if (cached) {
      await prefetchFeedHeroImages(cached);
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
        selectedRegion: region,
        status: "idle",
        error: null,
      });
      prefetchRegionsSequentially(region);
      return;
    }

    set({
      selectedRegion: region,
      countries: [],
      currentIndex: 0,
      status: "loading",
      error: null,
    });

    try {
      const data = await ensureRegionCountries(region);
      if (requestId !== regionFilterGeneration) return;

      await prefetchFeedHeroImages(data);
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
        selectedRegion: region,
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImages(countries.slice(0, 4));
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
    const { nextCursor, status, selectedRegion } = get();
    if (selectedRegion !== null || nextCursor === null || isLoading(status)) {
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
    const clamped = Math.max(0, Math.min(index, countries.length - 1));
    set({ currentIndex: clamped });
  },

  focusCountryInFeed: (country: Country) => {
    const { forYouSnapshot, nextCursor, status, focusEpoch } = get();
    const nextStatus = status === "loading" ? "idle" : status;

    if (!forYouSnapshot || forYouSnapshot.countries.length === 0) {
      set({
        countries: [country],
        currentIndex: 0,
        focusEpoch: focusEpoch + 1,
        status: nextStatus,
      });
      void get().loadInitialFeed(undefined, { force: true });
      return;
    }

    const tail = forYouSnapshot.countries.filter(
      (c) => c.name !== country.name,
    );

    set({
      countries: [country, ...tail],
      currentIndex: 0,
      focusEpoch: focusEpoch + 1,
      nextCursor: forYouSnapshot.nextCursor ?? nextCursor,
      status: nextStatus,
    });
  },

  getCurrentCountry: () => {
    const { countries, currentIndex } = get();
    return countries[currentIndex];
  },

  resetFeed: () => {
    regionFilterGeneration += 1;
    cancelRegionPrefetch();
    regionFetchPromises.clear();
    set({
      countries: [],
      nextCursor: null,
      currentIndex: 0,
      focusEpoch: 0,
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
