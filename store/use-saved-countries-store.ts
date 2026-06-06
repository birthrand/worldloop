import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildFlagCdnUrl } from "@/lib/flag-url";
import type { Country } from "@/types/country";

export type SavedCategory = "favorites" | "want-to-visit";

/**
 * Bookmarked countries keyed by list order; uniqueness is enforced by `country.name`.
 */
type SavedCountriesState = {
  savedCountries: Country[];
  savedAtByName: Record<string, number>;
  categoryByName: Record<string, SavedCategory>;
  /** Persisted sentinel — prevents demo seed from re-running after an intentional clear. */
  hasSeeded: boolean;
  toggleSaved: (country: Country) => void;
  isSaved: (name: string) => boolean;
  getSavedAt: (name: string) => number | null;
  setCategory: (name: string, category: SavedCategory) => void;
  getCountriesByCategory: (category: SavedCategory) => Country[];
  enrichFromFeed: (feedCountries: Country[]) => void;
  seedIfEmpty: () => void;
  clearSaved: () => void;
};

const DEFAULT_SEED_FUN_FACT =
  "Discover culture, landscapes, and stories worth saving.";

const SEED_FUN_FACTS: Record<string, string> = {
  Peru: "Land of ancient wonders, vibrant culture, and breathtaking landscapes.",
  Japan: "Where tradition meets the future in harmony.",
  Iceland: "Fire and ice unite in a land of raw natural beauty.",
  "New Zealand": "Adventure awaits amidst stunning fjords and Maori culture.",
  Italy: "A feast for the senses with art, history, and cuisine.",
  Morocco: "Vibrant souks, majestic dunes, and ancient medinas.",
  Canada: "Vast wilderness and cosmopolitan cities await.",
};

function seedCountry(
  name: string,
  cca2: string,
  capital: string,
  region: string,
  population: number,
  latlng: [number, number],
  images?: string[],
  funFact?: string,
): Country {
  const fact = funFact ?? SEED_FUN_FACTS[name] ?? DEFAULT_SEED_FUN_FACT;

  return {
    name,
    cca2,
    capital,
    region,
    population,
    flag: buildFlagCdnUrl(cca2),
    latlng,
    images: images ?? [],
    ai: {
      fact,
      facts: [fact],
      caption: fact,
      narration: "",
    },
  };
}

function buildSeedData(): Pick<
  SavedCountriesState,
  "savedCountries" | "savedAtByName" | "categoryByName"
> {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const entries: Array<{
    country: Country;
    category: SavedCategory;
    savedAt: number;
  }> = [
    {
      country: seedCountry(
        "Peru",
        "PE",
        "Lima",
        "South America",
        33_715_471,
        [-9.19, -75.0152],
        ["https://images.unsplash.com/photo-1526392060635-9d59825da76e?w=800"],
      ),
      category: "favorites",
      savedAt: now - 3 * DAY,
    },
    {
      country: seedCountry(
        "Japan",
        "JP",
        "Tokyo",
        "Asia",
        125_584_838,
        [36.2048, 138.2529],
        ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800"],
      ),
      category: "want-to-visit",
      savedAt: now - 7 * DAY,
    },
    {
      country: seedCountry(
        "Iceland",
        "IS",
        "Reykjavik",
        "Europe",
        366_425,
        [64.9631, -19.0208],
        ["https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800"],
      ),
      category: "want-to-visit",
      savedAt: now - 5 * DAY,
    },
    {
      country: seedCountry(
        "New Zealand",
        "NZ",
        "Wellington",
        "Oceania",
        5_228_100,
        [-40.9006, 174.886],
        ["https://images.unsplash.com/photo-1469521669192-eeab2232b117?w=800"],
      ),
      category: "want-to-visit",
      savedAt: now - 2 * DAY,
    },
    {
      country: seedCountry(
        "Italy",
        "IT",
        "Rome",
        "Europe",
        58_853_482,
        [41.8719, 12.5674],
        ["https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800"],
      ),
      category: "favorites",
      savedAt: now - 2 * HOUR,
    },
    {
      country: seedCountry(
        "Morocco",
        "MA",
        "Rabat",
        "Africa",
        37_840_044,
        [31.7917, -7.0926],
        ["https://images.unsplash.com/photo-1489749856437-fa599e7aebb2?w=800"],
      ),
      category: "favorites",
      savedAt: now - DAY,
    },
    {
      country: seedCountry(
        "Canada",
        "CA",
        "Ottawa",
        "North America",
        38_155_908,
        [56.1304, -106.3468],
        ["https://images.unsplash.com/photo-1519832979-6fa567a0e9cd?w=800"],
      ),
      category: "want-to-visit",
      savedAt: now - 2 * DAY,
    },
  ];

  const savedAtByName: Record<string, number> = {};
  const categoryByName: Record<string, SavedCategory> = {};

  for (const entry of entries) {
    savedAtByName[entry.country.name] = entry.savedAt;
    categoryByName[entry.country.name] = entry.category;
  }

  return {
    savedCountries: entries.map((entry) => entry.country),
    savedAtByName,
    categoryByName,
  };
}

function mergeCountryFromFeed(
  saved: Country,
  feedCountries: Country[],
): Country {
  const match = feedCountries.find((c) => c.name === saved.name);
  return match ?? saved;
}

export const useSavedCountriesStore = create<SavedCountriesState>()(
  persist(
    (set, get) => ({
      savedCountries: [],
      savedAtByName: {},
      categoryByName: {},
      hasSeeded: false,

      toggleSaved: (country: Country) => {
        const { savedCountries, savedAtByName, categoryByName } = get();
        const exists = savedCountries.some((c) => c.name === country.name);

        if (exists) {
          const nextSavedAt = { ...savedAtByName };
          const nextCategories = { ...categoryByName };
          delete nextSavedAt[country.name];
          delete nextCategories[country.name];

          set({
            savedCountries: savedCountries.filter(
              (c) => c.name !== country.name,
            ),
            savedAtByName: nextSavedAt,
            categoryByName: nextCategories,
          });
          return;
        }

        set({
          savedCountries: [...savedCountries, country],
          savedAtByName: {
            ...savedAtByName,
            [country.name]: Date.now(),
          },
          categoryByName: {
            ...categoryByName,
            [country.name]: categoryByName[country.name] ?? "favorites",
          },
        });
      },

      isSaved: (name: string) =>
        get().savedCountries.some((c) => c.name === name),

      getSavedAt: (name: string) => get().savedAtByName[name] ?? null,

      setCategory: (name: string, category: SavedCategory) => {
        if (!get().isSaved(name)) return;
        set({
          categoryByName: {
            ...get().categoryByName,
            [name]: category,
          },
        });
      },

      getCountriesByCategory: (category: SavedCategory) => {
        const { savedCountries, categoryByName } = get();
        return savedCountries.filter(
          (country) => categoryByName[country.name] === category,
        );
      },

      enrichFromFeed: (feedCountries: Country[]) => {
        if (feedCountries.length === 0) return;

        const { savedCountries } = get();
        if (savedCountries.length === 0) return;

        const enriched = savedCountries.map((country) =>
          mergeCountryFromFeed(country, feedCountries),
        );

        const changed = enriched.some(
          (country, index) => country !== savedCountries[index],
        );
        if (changed) {
          set({ savedCountries: enriched });
        }
      },

      seedIfEmpty: () => {
        if (get().hasSeeded) return;
        if (get().savedCountries.length > 0) {
          set({ hasSeeded: true });
          return;
        }
        set({ ...buildSeedData(), hasSeeded: true });
      },

      clearSaved: () =>
        set({
          savedCountries: [],
          savedAtByName: {},
          categoryByName: {},
        }),
    }),
    {
      name: "worldloop-saved-countries",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        state.savedAtByName = state.savedAtByName ?? {};
        state.categoryByName = state.categoryByName ?? {};
        if (state.hasSeeded === undefined) {
          state.hasSeeded = state.savedCountries.length > 0;
        }

        for (const country of state.savedCountries) {
          if (!state.savedAtByName[country.name]) {
            state.savedAtByName[country.name] = Date.now();
          }
          if (!state.categoryByName[country.name]) {
            state.categoryByName[country.name] = "favorites";
          }
        }
      },
    },
  ),
);
