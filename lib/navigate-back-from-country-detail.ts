import { router } from "expo-router";

import { restoreExploreMapPreviewSession } from "@/lib/explore-map-session";
import { restoreTravelMapLandmarkPreviewSession } from "@/lib/travel-map-session";
import { useIdentityStore } from "@/store/use-identity-store";

/** Country detail back — restore map preview when opened from there. */
export function navigateBackFromCountryDetail(): void {
  const { countryDetailReturnToMap, travelMapSessionActive } =
    useIdentityStore.getState();

  if (countryDetailReturnToMap && travelMapSessionActive) {
    restoreTravelMapLandmarkPreviewSession();
    router.dismissTo("/(tabs)/map");
    return;
  }

  if (countryDetailReturnToMap) {
    restoreExploreMapPreviewSession();
    router.dismissTo("/(tabs)/map");
    return;
  }

  router.back();
}
