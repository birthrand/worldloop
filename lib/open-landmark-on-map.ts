import { router } from "expo-router";

import type { CountryLandmark } from "@/lib/api";
import { focusCountryOnMap } from "@/lib/open-country-on-map";
import { useCountryDetailFocusStore } from "@/store/use-country-detail-focus-store";
import { useIdentityStore } from "@/store/use-identity-store";
import type { Country } from "@/types/country";
import type { MapLandmarkFocus } from "@/types/map-presentation";

function resolveLandmarkFocus(
  landmark: CountryLandmark,
): MapLandmarkFocus | null {
  const { latitude, longitude } = landmark;
  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    id: landmark.id,
    name: landmark.name,
    latitude,
    longitude,
  };
}

/** Open the map focused on a landmark pin from country detail (no travel-map legend). */
export function openLandmarkOnMap(
  landmark: CountryLandmark,
  country: Country,
): boolean {
  const landmarkFocus = resolveLandmarkFocus(landmark);
  if (!landmarkFocus) {
    return false;
  }

  useCountryDetailFocusStore.getState().setFocusLandmarkId(landmark.id);
  useIdentityStore.getState().setTravelLandmarkPreviewPinId(null);

  focusCountryOnMap(country, "countryDetail", { landmarkFocus });
  router.push("/(tabs)/map");
  return true;
}
