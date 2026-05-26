import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Country } from "@/types/country";

/**
 * Bookmarked countries keyed by list order; uniqueness is enforced by `country.name`.
 */
type SavedCountriesState = {
  savedCountries: Country[];
  toggleSaved: (country: Country) => void;
  isSaved: (name: string) => boolean;
  clearSaved: () => void;
};

export const useSavedCountriesStore = create<SavedCountriesState>()(
  persist(
    (set, get) => ({
      savedCountries: [],

      toggleSaved: (country: Country) => {
        const { savedCountries } = get();
        const exists = savedCountries.some((c) => c.name === country.name);

        if (exists) {
          set({
            savedCountries: savedCountries.filter(
              (c) => c.name !== country.name,
            ),
          });
          return;
        }

        set({ savedCountries: [...savedCountries, country] });
      },

      isSaved: (name: string) =>
        get().savedCountries.some((c) => c.name === name),

      clearSaved: () => set({ savedCountries: [] }),
    }),
    {
      name: "worldloop-saved-countries",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
