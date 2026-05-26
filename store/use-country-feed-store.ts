import { create } from "zustand";

import { fetchFeedCountries } from "@/lib/api";
import type { Country } from "@/types/country";

const DEFAULT_LIMIT = 20;

type FeedStatus = "idle" | "loading" | "loadingMore" | "error";

type CountryFeedState = {
  countries: Country[];
  nextCursor: string | null;
  currentIndex: number;
  status: FeedStatus;
  error: string | null;
  loadInitialFeed: (limit?: number) => Promise<void>;
  loadMoreFeed: (limit?: number) => Promise<void>;
  setCurrentIndex: (index: number) => void;
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
  status: "idle",
  error: null,

  loadInitialFeed: async (limit = DEFAULT_LIMIT) => {
    if (isLoading(get().status)) return;

    set({ status: "loading", error: null });

    try {
      const { data, nextCursor } = await fetchFeedCountries(undefined, limit);
      set({
        countries: data,
        nextCursor,
        currentIndex: 0,
        status: "idle",
        error: null,
      });
    } catch (err) {
      set({
        status: "error",
        error:
          err instanceof Error ? err.message : "Failed to load country feed",
      });
    }
  },

  loadMoreFeed: async (limit = DEFAULT_LIMIT) => {
    const { nextCursor, status } = get();
    if (nextCursor === null || isLoading(status)) return;

    set({ status: "loadingMore", error: null });

    try {
      const { data, nextCursor: newCursor } = await fetchFeedCountries(
        nextCursor,
        limit,
      );
      const { countries } = get();
      set({
        countries: [...countries, ...data],
        nextCursor: newCursor,
        status: "idle",
        error: null,
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

  getCurrentCountry: () => {
    const { countries, currentIndex } = get();
    return countries[currentIndex];
  },

  resetFeed: () => {
    set({
      countries: [],
      nextCursor: null,
      currentIndex: 0,
      status: "idle",
      error: null,
    });
  },
}));
