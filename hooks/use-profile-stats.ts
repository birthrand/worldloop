import { useMemo } from "react";

import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";
import type { Country } from "@/types/country";

const DEFAULT_PLACES = 128;
const DEFAULT_PHOTOS = 128;

export type ProfileInlineStats = {
  countries: number;
  cities: number;
  places: number;
};

export type VisitedCountryPreview = {
  id: string;
  cca2: string;
  flag: string;
  visitedAt: number;
};

export function formatDiscoveredCountriesSubtitle(count: number): string {
  if (count === 0) {
    return "Open country or landmark details to discover";
  }
  if (count === 1) {
    return "1 country discovered";
  }
  return `${count} countries discovered`;
}

export function useProfileStats() {
  const countriesDiscovered = useDiscoveryProgressStore(
    (s) => s.countriesDiscovered,
  );
  const landmarksExplored = useDiscoveryProgressStore(
    (s) => s.landmarksExplored,
  );
  const countriesExplored = useDiscoveryProgressStore(
    (s) => s.countriesExplored,
  );
  const visitedCountryIds = useDiscoveryProgressStore(
    (s) => s.visitedCountryIds,
  );
  const visitedAtByCountryId = useDiscoveryProgressStore(
    (s) => s.visitedAtByCountryId,
  );
  const visitedCountryById = useDiscoveryProgressStore(
    (s) => s.visitedCountryById,
  );
  const savedCountries = useSavedCountriesStore((s) => s.savedCountries);
  const savedLandmarks = useSavedLandmarksStore((s) => s.savedLandmarks);
  const feedCountries = useCountryFeedStore((s) => s.countries);

  const allKnownCountries = useMemo(() => {
    const byId = new Map<string, Country>();
    for (const country of [...feedCountries, ...savedCountries]) {
      const id = country.cca2?.trim().toUpperCase() || country.name.trim();
      if (!byId.has(id)) {
        byId.set(id, country);
      }
    }
    for (const [id, snapshot] of Object.entries(visitedCountryById)) {
      if (byId.has(id)) continue;
      byId.set(id, {
        name: snapshot.name,
        cca2: snapshot.cca2,
        flag: snapshot.flag,
        population: 0,
        region: "",
        capital: "",
        images: [],
        latlng: [0, 0],
      });
    }
    return byId;
  }, [feedCountries, savedCountries, visitedCountryById]);

  const landmarksExploredCount = landmarksExplored;

  const totalSavedCount = savedCountries.length + savedLandmarks.length;

  const placesCount = totalSavedCount > 0 ? totalSavedCount : DEFAULT_PLACES;

  const photosCount =
    savedCountries.length > 0 ? savedCountries.length : DEFAULT_PHOTOS;

  const continentsCount = useMemo(() => {
    const regions = new Set<string>();
    for (const id of visitedCountryIds) {
      const country = allKnownCountries.get(id);
      if (country?.region) {
        regions.add(country.region);
      }
    }
    if (regions.size > 0) return regions.size;
    return countriesDiscovered > 0 ? 1 : 7;
  }, [allKnownCountries, countriesDiscovered, visitedCountryIds]);

  const topVisitedCountries = useMemo((): VisitedCountryPreview[] => {
    return visitedCountryIds
      .map((id) => {
        const country =
          allKnownCountries.get(id) ?? visitedCountryById[id] ?? null;
        return {
          id,
          cca2: country?.cca2 ?? id,
          flag: country?.flag ?? "",
          visitedAt: visitedAtByCountryId[id] ?? 0,
        };
      })
      .sort((a, b) => b.visitedAt - a.visitedAt);
  }, [
    allKnownCountries,
    visitedAtByCountryId,
    visitedCountryById,
    visitedCountryIds,
  ]);

  const savedThumbnailUri =
    savedLandmarks[0]?.landmark.imageUrl ??
    savedCountries[0]?.images?.[0] ??
    savedCountries[0]?.flag ??
    null;

  return {
    inlineStats: {
      countries: countriesDiscovered,
      cities: landmarksExploredCount,
      places: placesCount,
    } satisfies ProfileInlineStats,
    countriesDiscovered,
    countriesExplored,
    discoveredCountriesSubtitle:
      formatDiscoveredCountriesSubtitle(countriesDiscovered),
    landmarksExploredCount,
    placesCount,
    photosCount,
    continentsCount,
    savedCount: totalSavedCount,
    topVisitedCountries,
    savedThumbnailUri,
  };
}
