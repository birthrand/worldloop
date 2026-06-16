import { useMemo } from "react";

import { countryToMapCountry } from "@/lib/map-country";
import {
  getTravelMapPinData,
  type TravelMapPinData,
} from "@/lib/travel-map-pins";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";

export function useTravelMapPinData(): TravelMapPinData {
  const feedCountries = useCountryFeedStore((s) => s.countries);
  const savedCountries = useSavedCountriesStore((s) => s.savedCountries);
  const savedLandmarks = useSavedLandmarksStore((s) => s.savedLandmarks);
  const historyEntries = useRecentlyViewedStore((s) => s.entries);
  const visitedCountryIds = useDiscoveryProgressStore(
    (s) => s.visitedCountryIds,
  );
  const visitedCountryById = useDiscoveryProgressStore(
    (s) => s.visitedCountryById,
  );

  return useMemo(
    () => getTravelMapPinData(),
    [
      feedCountries,
      savedCountries,
      savedLandmarks,
      historyEntries,
      visitedCountryIds,
      visitedCountryById,
    ],
  );
}

export function findTravelMapCountry(
  pinData: TravelMapPinData,
  name: string,
): ReturnType<typeof countryToMapCountry> | null {
  return (
    pinData.countries.find((country) => country.name === name.trim()) ?? null
  );
}
