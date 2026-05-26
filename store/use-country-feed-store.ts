import { create } from "zustand";

import { fetchFeedCountries, fetchSearchCountries } from "@/lib/api";
import { prefetchFeedHeroImages } from "@/lib/prefetch-feed-heroes";
import type { Country } from "@/types/country";

let regionFilterGeneration = 0;

const DEFAULT_LIMIT = 20;

type FeedStatus = "idle" | "loading" | "loadingMore" | "error";

type ForYouSnapshot = {
  countries: Country[];
  nextCursor: string | null;
};

type CountryFeedState = {
  countries: Country[];
  nextCursor: string | null;
  currentIndex: number;
  selectedRegion: string | null;
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
  setCurrentIndex: (index: number) => void;
  focusCountryInFeed: (country: Country) => void;
  getCurrentCountry: () => Country | undefined;
  resetFeed: () => void;
};

function isLoading(status: FeedStatus): boolean {
  return status === "loading" || status === "loadingMore";
}

export const useCountryFeedStore = create<CountryFeedState>((set, get) => ({
  countries: [],
  nextCursor: null,
  currentIndex: 0,
  selectedRegion: null,
  regionCache: {},
  forYouSnapshot: null,
  status: "idle",
  error: null,

  loadInitialFeed: async (limit = DEFAULT_LIMIT, options) => {
    if (!options?.force && get().countries.length > 0) return;
    if (isLoading(get().status)) return;

    const showBlockingLoad = get().countries.length === 0;
    if (showBlockingLoad) {
      set({ status: "loading", error: null });
    }

    try {
      const { data, nextCursor } = await fetchFeedCountries(undefined, limit);
      await prefetchFeedHeroImages(data);
      set({
        countries: data,
        nextCursor,
        currentIndex: 0,
        selectedRegion: null,
        forYouSnapshot: { countries: data, nextCursor },
        status: "idle",
        error: null,
      });
      void prefetchFeedHeroImages(data.slice(2));
    } catch (err) {
      set({
        status: "error",
        error:
          err instanceof Error ? err.message : "Failed to load country feed",
      });
    }
  },

  setRegionFilter: async (region) => {
    if (isLoading(get().status)) return;

    const requestId = ++regionFilterGeneration;

    if (region === null) {
      const snapshot = get().forYouSnapshot;
      if (snapshot && snapshot.countries.length > 0) {
        await prefetchFeedHeroImages(snapshot.countries);
        if (requestId !== regionFilterGeneration) return;

        set({
          countries: snapshot.countries,
          nextCursor: snapshot.nextCursor,
          currentIndex: 0,
          selectedRegion: null,
          status: "idle",
          error: null,
        });
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

      set({
        countries: cached,
        nextCursor: null,
        currentIndex: 0,
        selectedRegion: region,
        status: "idle",
        error: null,
      });
      return;
    }

    set({ selectedRegion: region, currentIndex: 0, error: null });

    try {
      const { data } = await fetchSearchCountries(undefined, region);
      if (requestId !== regionFilterGeneration) return;

      await prefetchFeedHeroImages(data);
      if (requestId !== regionFilterGeneration) return;

      set((state) => ({
        countries: data,
        nextCursor: null,
        currentIndex: 0,
        selectedRegion: region,
        status: "idle",
        error: null,
        regionCache: { ...state.regionCache, [region]: data },
      }));
      void prefetchFeedHeroImages(data.slice(2, 6));
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
        const nextCountries = [...state.countries, ...uniqueNew];
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
    set({
      countries: [],
      nextCursor: null,
      currentIndex: 0,
      selectedRegion: null,
      regionCache: {},
      forYouSnapshot: null,
      status: "idle",
      error: null,
    });
  },
}));
