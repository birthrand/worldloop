import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildFlagCdnUrl } from "@/lib/flag-url";
import type { Country } from "@/types/country";

const MAX_RECENT = 8;

export type RecentlyViewedEntry = {
  country: Country;
  viewedAt: number;
};

type RecentlyViewedState = {
  entries: RecentlyViewedEntry[];
  recordView: (country: Country) => void;
  seedIfEmpty: () => void;
  clearRecentlyViewed: () => void;
};

function seedCountry(
  name: string,
  cca2: string,
  capital: string,
  region: string,
  population: number,
  latlng: [number, number],
  images?: string[],
): Country {
  return {
    name,
    cca2,
    capital,
    region,
    population,
    flag: buildFlagCdnUrl(cca2),
    latlng,
    images,
  };
}

/** Design-matched seed entries for first launch only. */
function buildSeedEntries(): RecentlyViewedEntry[] {
  const now = Date.now();
  return [
    {
      country: seedCountry(
        "Peru",
        "PE",
        "Lima",
        "Americas",
        33_715_471,
        [-9.19, -75.0152],
        [
          "https://images.unsplash.com/photo-1526392060635-9d59825da76e?w=800",
        ],
      ),
      viewedAt: now,
    },
    {
      country: seedCountry(
        "Italy",
        "IT",
        "Rome",
        "Europe",
        58_853_482,
        [41.8719, 12.5674],
        [
          "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800",
        ],
      ),
      viewedAt: now - 2 * 60 * 60 * 1000,
    },
    {
      country: seedCountry(
        "Japan",
        "JP",
        "Tokyo",
        "Asia",
        125_584_838,
        [36.2048, 138.2529],
        [
          "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
        ],
      ),
      viewedAt: now - 24 * 60 * 60 * 1000,
    },
  ];
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      entries: [],

      recordView: (country: Country) => {
        const { entries } = get();
        const without = entries.filter((e) => e.country.name !== country.name);
        const next: RecentlyViewedEntry[] = [
          { country, viewedAt: Date.now() },
          ...without,
        ].slice(0, MAX_RECENT);
        set({ entries: next });
      },

      seedIfEmpty: () => {
        if (get().entries.length === 0) {
          set({ entries: buildSeedEntries() });
        }
      },

      clearRecentlyViewed: () => set({ entries: [] }),
    }),
    {
      name: "worldloop-recently-viewed",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
