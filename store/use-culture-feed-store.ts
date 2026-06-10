import { create } from "zustand";

import { fetchCultureFeedCountries } from "@/lib/api";
import { normalizeCountriesRegions } from "@/lib/app-region";
import { createCultureSessionSeed } from "@/lib/culture-session-seed";
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
  sessionSeed: string;
  totalVideoCountries: number | null;
};

type CultureFeedState = {
  countries: Country[];
  nextCursor: string | null;
  currentIndex: number;
  /** Bumped when opening a country from search so Culture remounts at index 0. */
  focusEpoch: number;
  hasLoadedOnce: boolean;
  selectedRegion: string | null;
  sortField: FeedSortField | null;
  sortOrder: FeedSortOrder | null;
  forYouSnapshot: ForYouSnapshot | null;
  sessionSeed: string;
  totalVideoCountries: number | null;
  regionCache: Record<string, Country[]>;
  isMuted: boolean;
  isSortSheetOpen: boolean;
  status: FeedStatus;
  error: string | null;
  loadInitialFeed: (options?: {
    force?: boolean;
    seed?: string;
  }) => Promise<void>;
  loadMoreFeed: (limit?: number) => Promise<void>;
  extendCultureFeedAtEnd: () => Promise<void>;
  refreshCultureFeed: () => Promise<void>;
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

  const { sessionSeed, totalVideoCountries } = useCultureFeedStore.getState();

  useCultureFeedStore.setState({
    forYouSnapshot: {
      countries,
      nextCursor,
      sessionSeed,
      totalVideoCountries,
    },
  });
}

function orderCultureFeedCountries(
  countries: Country[],
  sortField: FeedSortField | null,
  sortOrder: FeedSortOrder | null,
): Country[] {
  if ((sortOrder ?? DEFAULT_FEED_SORT_ORDER) === "random") {
    return countries;
  }
  return sortCountries(countries, sortField, sortOrder);
}

export const useCultureFeedStore = create<CultureFeedState>((set, get) => ({
  countries: [],
  nextCursor: null,
  currentIndex: 0,
  focusEpoch: 0,
  hasLoadedOnce: false,
  selectedRegion: null,
  sortField: DEFAULT_FEED_SORT_FIELD,
  sortOrder: DEFAULT_FEED_SORT_ORDER,
  forYouSnapshot: null,
  sessionSeed: createCultureSessionSeed(),
  totalVideoCountries: null,
  regionCache: {},
  isMuted: true,
  isSortSheetOpen: false,
  status: "idle",
  error: null,

  loadInitialFeed: async (options) => {
    if (!options?.force && get().countries.length > 0) return;
    if (!options?.force && isLoading(get().status)) return;

    const sessionSeed =
      options?.seed ??
      (options?.force ? createCultureSessionSeed() : get().sessionSeed);

    set({ status: "loading", error: null, selectedRegion: null, sessionSeed });

    try {
      const { data, nextCursor, meta } = await fetchCultureFeedCountries(
        sessionSeed,
        undefined,
        DEFAULT_LIMIT,
      );
      const normalized = normalizeCountriesRegions(data);
      const { sortField, sortOrder } = get();
      const ordered = orderCultureFeedCountries(
        normalized,
        sortField,
        sortOrder,
      );

      set({
        countries: ordered,
        nextCursor,
        currentIndex: 0,
        hasLoadedOnce: true,
        selectedRegion: null,
        totalVideoCountries: meta.total,
        forYouSnapshot: {
          countries: ordered,
          nextCursor,
          sessionSeed: meta.seed,
          totalVideoCountries: meta.total,
        },
        sessionSeed: meta.seed,
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
        sessionSeed: snapshot.sessionSeed,
        totalVideoCountries: snapshot.totalVideoCountries,
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

  extendCultureFeedAtEnd: async () => {
    const state = get();
    if (state.selectedRegion !== null || isLoading(state.status)) {
      return;
    }

    if (state.nextCursor !== null) {
      await get().loadMoreFeed();
      return;
    }

    set({ status: "loadingMore", error: null });

    try {
      const sessionSeed = createCultureSessionSeed();
      const { data, nextCursor, meta } = await fetchCultureFeedCountries(
        sessionSeed,
        undefined,
        DEFAULT_LIMIT,
      );
      const normalized = normalizeCountriesRegions(data);
      const ordered = orderCultureFeedCountries(
        normalized,
        state.sortField,
        state.sortOrder,
      );

      set((current) => {
        const existingNames = new Set(
          current.countries.map((country) => country.name),
        );
        const uniqueNew = ordered.filter(
          (country) => !existingNames.has(country.name),
        );
        const toAppend = uniqueNew.length > 0 ? uniqueNew : ordered;

        return {
          countries: [...current.countries, ...toAppend],
          nextCursor,
          sessionSeed: meta.seed,
          totalVideoCountries: meta.total,
          status: "idle",
          error: null,
        };
      });
    } catch (err) {
      set({
        status: "error",
        error:
          err instanceof Error ? err.message : "Failed to extend culture feed",
      });
    }
  },

  refreshCultureFeed: async () => {
    const { selectedRegion, status } = get();
    if (isLoading(status)) {
      return;
    }

    if (selectedRegion !== null) {
      await get().setRegionFilter(selectedRegion);
      return;
    }

    set({
      countries: [],
      nextCursor: null,
      currentIndex: 0,
      forYouSnapshot: null,
      sessionSeed: createCultureSessionSeed(),
      totalVideoCountries: null,
      error: null,
    });
    await get().loadInitialFeed({ force: true });
  },

  loadMoreFeed: async (limit = DEFAULT_LIMIT) => {
    const { nextCursor, status, selectedRegion, sessionSeed } = get();
    if (selectedRegion !== null || nextCursor === null || isLoading(status)) {
      return;
    }

    const originalNextCursor = nextCursor;

    set({ status: "loadingMore", error: null });

    try {
      const {
        data,
        nextCursor: newCursor,
        meta,
      } = await fetchCultureFeedCountries(
        sessionSeed,
        originalNextCursor,
        limit,
      );
      const normalized = normalizeCountriesRegions(data);
      const ordered = orderCultureFeedCountries(
        normalized,
        get().sortField,
        get().sortOrder,
      );

      set((state) => {
        if (
          state.selectedRegion !== null ||
          state.nextCursor !== originalNextCursor
        ) {
          return state;
        }

        const existingNames = new Set(
          state.countries.map((country) => country.name),
        );
        const uniqueNew = ordered.filter(
          (country) => !existingNames.has(country.name),
        );

        const isRandom =
          (state.sortOrder ?? DEFAULT_FEED_SORT_ORDER) === "random";
        const appended = mergeUniqueCultureCountries(
          state.countries,
          uniqueNew,
        );
        const nextCountries = isRandom
          ? appended
          : sortCountries(appended, state.sortField, state.sortOrder);
        const snapshotTail = state.forYouSnapshot
          ? isRandom
            ? mergeUniqueCultureCountries(
                state.forYouSnapshot.countries,
                uniqueNew,
              )
            : sortCountries(
                mergeUniqueCultureCountries(
                  state.forYouSnapshot.countries,
                  uniqueNew,
                ),
                state.sortField,
                state.sortOrder,
              )
          : nextCountries;

        return {
          countries: nextCountries,
          nextCursor: newCursor,
          totalVideoCountries: meta.total,
          status: "idle",
          error: null,
          forYouSnapshot: state.forYouSnapshot
            ? {
                countries: snapshotTail,
                nextCursor: newCursor,
                sessionSeed: state.forYouSnapshot.sessionSeed,
                totalVideoCountries: meta.total,
              }
            : null,
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
    if (!hasCultureVideo(country)) return;

    const { forYouSnapshot, nextCursor, status, focusEpoch, selectedRegion } =
      get();
    const nextStatus = status === "loading" ? "idle" : status;

    if (selectedRegion !== null) {
      const tail = get().countries.filter((item) => item.name !== country.name);
      set({
        countries: [country, ...tail],
        currentIndex: 0,
        focusEpoch: focusEpoch + 1,
        status: nextStatus,
      });
      return;
    }

    if (!forYouSnapshot || forYouSnapshot.countries.length === 0) {
      set({
        countries: [country],
        currentIndex: 0,
        focusEpoch: focusEpoch + 1,
        status: nextStatus,
      });
      void get().loadInitialFeed({ force: true });
      return;
    }

    const tail = forYouSnapshot.countries.filter(
      (item) => item.name !== country.name,
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
}));
