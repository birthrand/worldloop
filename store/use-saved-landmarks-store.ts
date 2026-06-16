import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  getStaticCountries,
  isStaticCountryCatalogEnabled,
} from "@/lib/static-countries";
import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

type SavedLandmarksState = {
  savedLandmarks: PlaceFeedItem[];
  savedAtById: Record<string, number>;
  toggleSaved: (item: PlaceFeedItem) => void;
  isSaved: (landmarkId: string) => boolean;
  enrichFromFeed: (feedCountries: Country[]) => void;
  clearSaved: () => void;
};

function mergeCountryFromFeed(
  country: Country,
  feedCountries: Country[],
): Country {
  const match = feedCountries.find((c) => c.name === country.name);
  return match ?? country;
}

export const useSavedLandmarksStore = create<SavedLandmarksState>()(
  persist(
    (set, get) => ({
      savedLandmarks: [],
      savedAtById: {},

      toggleSaved: (item: PlaceFeedItem) => {
        const { savedLandmarks, savedAtById } = get();
        const id = item.landmark.id;
        const exists = savedLandmarks.some((entry) => entry.landmark.id === id);

        if (exists) {
          const nextSavedAt = { ...savedAtById };
          delete nextSavedAt[id];

          set({
            savedLandmarks: savedLandmarks.filter(
              (entry) => entry.landmark.id !== id,
            ),
            savedAtById: nextSavedAt,
          });
          return;
        }

        set({
          savedLandmarks: [...savedLandmarks, item],
          savedAtById: {
            ...savedAtById,
            [id]: Date.now(),
          },
        });
      },

      isSaved: (landmarkId: string) =>
        get().savedLandmarks.some((entry) => entry.landmark.id === landmarkId),

      enrichFromFeed: (feedCountries: Country[]) => {
        const { savedLandmarks } = get();
        if (savedLandmarks.length === 0) return;

        const sources = isStaticCountryCatalogEnabled()
          ? getStaticCountries()
          : feedCountries;
        if (sources.length === 0) return;

        const enriched = savedLandmarks.map((entry) => ({
          ...entry,
          country: mergeCountryFromFeed(entry.country, sources),
        }));

        const changed = enriched.some(
          (entry, index) => entry.country !== savedLandmarks[index]?.country,
        );
        if (changed) {
          set({ savedLandmarks: enriched });
        }
      },

      clearSaved: () =>
        set({
          savedLandmarks: [],
          savedAtById: {},
        }),
    }),
    {
      name: "worldloop-saved-landmarks",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        state.savedAtById = state.savedAtById ?? {};

        for (const entry of state.savedLandmarks) {
          if (!state.savedAtById[entry.landmark.id]) {
            state.savedAtById[entry.landmark.id] = Date.now();
          }
        }
      },
    },
  ),
);
