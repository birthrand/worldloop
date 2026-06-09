import { create } from "zustand";

import { fetchFeedCountries } from "@/lib/api";
import { normalizeCountriesRegions } from "@/lib/app-region";
import { fetchExploreRegionCountries } from "@/lib/explore-region-countries";
import { hasCultureVideo } from "@/lib/format-country";
import {
  DEFAULT_FEED_SORT_FIELD,
  DEFAULT_FEED_SORT_ORDER,
  type FeedSortField,
  type FeedSortOrder,
} from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

const DEFAULT_LIMIT = 20;

type FeedStatus = "idle" | "loading" | "loadingMore" | "error";

type ForYouSnapshot = {
  countries: Country[];
  nextCursor: string | null;
};

type CultureFeedState = {
  countries: Country[];
  nextCursor: string | null;
  currentIndex: number;
  hasLoadedOnce: boolean;
  selectedRegion: string | null;
  sortField: FeedSortField | null;
  sortOrder: FeedSortOrder | null;
  forYouSnapshot: ForYouSnapshot | null;
  regionCache: Record<string, Country[]>;
  isMuted: boolean;
  isSortSheetOpen: boolean;
  status: FeedStatus;
  error: string | null;
  loadInitialFeed: (options?: { force?: boolean }) => Promise<void>;
  loadMoreFeed: (limit?: number) => Promise<void>;
  setRegionFilter: (region: string | null) => Promise<void>;
  restoreForYouFeed: () => Promise<void>;
  setCurrentIndex: (index: number) => void;
  setSort: (field: FeedSortField, order: FeedSortOrder) => void;
  toggleMuted: () => void;
  openSortSheet: () => void;
  closeSortSheet: () => void;
  focusCountryInCulture: (country: Country) => void;
  getCurrentCountry: () => Country | undefined;
};

let regionFilterGeneration = 0;

function isLoading(status: FeedStatus): boolean {
  return status === "loading" || status === "loadingMore";
}

function filterCultureCountries(countries: Country[]): Country[] {
  return countries.filter(hasCultureVideo);
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

function mergeUniqueCultureCountries(
  existing: Country[],
  incoming: Country[],
): Country[] {
  const seen = new Set(existing.map((country) => country.name));
  const uniqueIncoming = incoming.filter((country) => !seen.has(country.name));
  return [...existing, ...uniqueIncoming];
}

function snapshotForYouIfNeeded(): void {
  const { forYouSnapshot, nextCursor, selectedRegion, countries } =
    useCultureFeedStore.getState();

  if (selectedRegion !== null) return;
  if (forYouSnapshot) return;
  if (countries.length === 0) return;

  useCultureFeedStore.setState({
    forYouSnapshot: { countries, nextCursor },
  });
}

export const useCultureFeedStore = create<CultureFeedState>((set, get) => ({
  countries: [],
  nextCursor: null,
  currentIndex: 0,
  hasLoadedOnce: false,
  selectedRegion: null,
  sortField: DEFAULT_FEED_SORT_FIELD,
  sortOrder: DEFAULT_FEED_SORT_ORDER,
  forYouSnapshot: null,
  regionCache: {},
  isMuted: true,
  isSortSheetOpen: false,
  status: "idle",
  error: null,

  loadInitialFeed: async (options) => {
    if (!options?.force && get().countries.length > 0) return;
    if (!options?.force && isLoading(get().status)) return;

    set({ status: "loading", error: null, selectedRegion: null });

    try {
      const { data, nextCursor } = await fetchFeedCountries(
        undefined,
        DEFAULT_LIMIT,
      );
      const normalized = normalizeCountriesRegions(data);
      const cultureCountries = filterCultureCountries(normalized);
      const { sortField, sortOrder } = get();
      const sorted = sortCountries(cultureCountries, sortField, sortOrder);

      set({
        countries: sorted,
        nextCursor,
        currentIndex: 0,
        hasLoadedOnce: true,
        selectedRegion: null,
        forYouSnapshot: { countries: sorted, nextCursor },
        status: "idle",
        error: null,
      });
    } catch (err) {
      set({
        hasLoadedOnce: true,
        status: "error",
        error:
          err instanceof Error ? err.message : "Failed to load culture feed",
      });
    }
  },

  setRegionFilter: async (region) => {
    const requestId = ++regionFilterGeneration;

    if (region === null) {
      await get().restoreForYouFeed();
      return;
    }

    if (get().selectedRegion === region && get().status !== "error") return;

    snapshotForYouIfNeeded();

    const cached = get().regionCache[region];
    if (cached) {
      const { sortField, sortOrder } = get();
      const sorted = sortCountries(cached, sortField, sortOrder);
      set({
        countries: sorted,
        nextCursor: null,
        currentIndex: 0,
        selectedRegion: region,
        status: "idle",
        error: null,
      });
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
      const data = await fetchExploreRegionCountries(region);
      if (requestId !== regionFilterGeneration) return;

      const normalized = normalizeCountriesRegions(data);
      const cultureCountries = filterCultureCountries(normalized);
      const { sortField, sortOrder } = get();
      const sorted = sortCountries(cultureCountries, sortField, sortOrder);

      set((state) => ({
        countries: sorted,
        nextCursor: null,
        currentIndex: 0,
        selectedRegion: region,
        regionCache: { ...state.regionCache, [region]: cultureCountries },
        status: "idle",
        error: null,
      }));
    } catch (err) {
      if (requestId !== regionFilterGeneration) return;

      set({
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : `Failed to load culture clips in ${region}`,
      });
    }
  },

  restoreForYouFeed: async () => {
    regionFilterGeneration += 1;

    const snapshot = get().forYouSnapshot;
    if (snapshot && snapshot.countries.length > 0) {
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

    set({
      selectedRegion: null,
      error: null,
    });
    await get().loadInitialFeed({ force: true });
  },

  loadMoreFeed: async (limit = DEFAULT_LIMIT) => {
    const { nextCursor, status, countries, selectedRegion } = get();
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
      const cultureCountries = filterCultureCountries(normalized);

      set((state) => {
        const merged = mergeUniqueCultureCountries(countries, cultureCountries);
        const nextCountries = sortCountries(
          merged,
          state.sortField,
          state.sortOrder,
        );
        const snapshotTail = state.forYouSnapshot
          ? sortCountries(
              mergeUniqueCultureCountries(
                state.forYouSnapshot.countries,
                cultureCountries,
              ),
              state.sortField,
              state.sortOrder,
            )
          : nextCountries;

        return {
          countries: nextCountries,
          nextCursor: newCursor,
          status: "idle",
          error: null,
          forYouSnapshot: {
            countries: snapshotTail,
            nextCursor: newCursor,
          },
        };
      });
    } catch (err) {
      set({
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : "Failed to load more culture clips",
      });
    }
  },

  setSort: (field, order) => {
    set((state) => ({
      sortField: field,
      sortOrder: order,
      countries: sortCountries(state.countries, field, order),
      currentIndex: 0,
      ...(state.selectedRegion === null && state.forYouSnapshot
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
    }));
  },

  toggleMuted: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  openSortSheet: () => {
    set({ isSortSheetOpen: true });
  },

  closeSortSheet: () => {
    set({ isSortSheetOpen: false });
  },

  setCurrentIndex: (index) => {
    const { countries } = get();
    if (countries.length === 0) {
      set({ currentIndex: 0 });
      return;
    }
    const clamped = Math.max(0, Math.min(index, countries.length - 1));
    set({ currentIndex: clamped });
  },

  focusCountryInCulture: (country) => {
    const { countries, status, selectedRegion, forYouSnapshot, nextCursor } =
      get();
    const nextStatus = status === "loading" ? "idle" : status;
    const existingIndex = countries.findIndex(
      (item) => item.name === country.name,
    );

    if (existingIndex >= 0) {
      const reordered = [
        countries[existingIndex],
        ...countries.filter((item) => item.name !== country.name),
      ];
      set({
        countries: reordered,
        currentIndex: 0,
        status: nextStatus,
      });
      return;
    }

    const nextCountries = [country, ...countries];
    set({
      countries: nextCountries,
      currentIndex: 0,
      status: nextStatus,
      ...(selectedRegion === null
        ? {
            forYouSnapshot: {
              countries: nextCountries,
              nextCursor: forYouSnapshot?.nextCursor ?? nextCursor,
            },
          }
        : {}),
    });
  },

  getCurrentCountry: () => {
    const { countries, currentIndex } = get();
    return countries[currentIndex];
  },
}));
