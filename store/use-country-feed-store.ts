import { create } from "zustand";

import { CONTINENTS } from "@/constants/regions";
import { fetchFeedCountries, fetchSearchCountries } from "@/lib/api";
import { prefetchFeedHeroImages } from "@/lib/prefetch-feed-heroes";
import type { Country } from "@/types/country";

let regionFilterGeneration = 0;
let regionPrefetchGeneration = 0;
const regionFetchPromises = new Map<string, Promise<Country[]>>();

const DEFAULT_LIMIT = 20;

type FeedStatus = "idle" | "loading" | "loadingMore" | "error";
type FeedSortField = "name" | "population";
type FeedSortOrder = "asc" | "desc";

type ForYouSnapshot = {
  countries: Country[];
  nextCursor: string | null;
};

type CountryFeedState = {
  countries: Country[];
  nextCursor: string | null;
  currentIndex: number;
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

function sortCountries(
  countries: Country[],
  sortField: FeedSortField | null,
  sortOrder: FeedSortOrder | null,
): Country[] {
  if (!sortField || !sortOrder) return countries;
  const direction = sortOrder === "asc" ? 1 : -1;
  return [...countries].sort((a, b) => {
    if (sortField === "population") {
      return (a.population - b.population) * direction;
    }
    return a.name.localeCompare(b.name) * direction;
  });
}

function cancelRegionPrefetch(): void {
  regionPrefetchGeneration += 1;
}

async function ensureRegionCountries(region: string): Promise<Country[]> {
  const cached = useCountryFeedStore.getState().regionCache[region];
  if (cached) return cached;

  const inFlight = regionFetchPromises.get(region);
  if (inFlight) return inFlight;

  const promise = fetchSearchCountries(undefined, region)
    .then(({ data }) => {
      useCountryFeedStore.setState((state) => ({
        regionCache: { ...state.regionCache, [region]: data },
      }));
      return data;
    })
    .finally(() => {
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
  selectedRegion: null,
  sortField: null,
  sortOrder: null,
  regionCache: {},
  forYouSnapshot: null,
  status: "idle",
  error: null,

  loadInitialFeed: async (limit = DEFAULT_LIMIT, options) => {
    if (!options?.force && get().countries.length > 0) return;
    if (!options?.force && isLoading(get().status)) return;

    const showBlockingLoad = get().countries.length === 0;
    if (showBlockingLoad) {
      set({ status: "loading", error: null });
    }

    try {
      const { data, nextCursor } = await fetchFeedCountries(undefined, limit);
      await prefetchFeedHeroImages(data);
      const { sortField, sortOrder } = get();
      set({
        countries: sortCountries(data, sortField, sortOrder),
        nextCursor,
        currentIndex: 0,
        selectedRegion: null,
        forYouSnapshot: { countries: data, nextCursor },
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImages(data.slice(2));
      prefetchRegionsSequentially(null);
    } catch (err) {
      set({
        status: "error",
        error:
          err instanceof Error ? err.message : "Failed to load country feed",
      });
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

    if (get().selectedRegion === region) return;

    if (get().selectedRegion === null && get().countries.length > 0) {
      const { countries, nextCursor } = get();
      set({
        forYouSnapshot: { countries, nextCursor },
      });
    }

    const cached = get().regionCache[region];
    if (cached) {
      await prefetchFeedHeroImages(cached);
      if (requestId !== regionFilterGeneration) return;
      const { sortField, sortOrder } = get();

      set({
        countries: sortCountries(cached, sortField, sortOrder),
        nextCursor: null,
        currentIndex: 0,
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
      const { sortField, sortOrder } = get();

      set({
        countries: sortCountries(data, sortField, sortOrder),
        nextCursor: null,
        currentIndex: 0,
        selectedRegion: region,
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImages(data.slice(2, 6));
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
      const { countries } = get();
      const existingNames = new Set(countries.map((c) => c.name));
      const uniqueNew = data.filter((c) => !existingNames.has(c.name));
      set((state) => {
        const nextCountries = sortCountries(
          [...state.countries, ...uniqueNew],
          state.sortField,
          state.sortOrder,
        );
        return {
          countries: nextCountries,
          nextCursor: newCursor,
          status: "idle",
          error: null,
          ...(state.selectedRegion === null
            ? {
                forYouSnapshot: {
                  countries: nextCountries,
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
    set((state) => ({
      sortField: field,
      sortOrder: order,
      countries: sortCountries(state.countries, field, order),
      currentIndex: 0,
    }));
  },

  clearSort: () => {
    set((state) => ({
      sortField: null,
      sortOrder: null,
      countries: [...state.countries],
      currentIndex: 0,
    }));
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
    const { countries } = get();
    const existingIndex = countries.findIndex((c) => c.name === country.name);
    if (existingIndex >= 0) {
      set({ currentIndex: existingIndex });
      return;
    }
    set({ countries: [country, ...countries], currentIndex: 0 });
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
      selectedRegion: null,
      sortField: null,
      sortOrder: null,
      regionCache: {},
      forYouSnapshot: null,
      status: "idle",
      error: null,
    });
  },
}));
