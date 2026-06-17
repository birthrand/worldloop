import { router } from "expo-router";

import { markExploreMapSessionDiscardPending } from "@/lib/explore-map-session";
import { markTravelMapSessionDiscardPending } from "@/lib/travel-map-session";
import { useIdentityStore } from "@/store/use-identity-store";
import { useMapLandmarkFocusStore } from "@/store/use-map-landmark-focus-store";

/** Map back — restore country detail when the map was opened from there. */
export function navigateBackFromMap(): void {
  useMapLandmarkFocusStore.getState().clearActiveLandmark();

  const {
    selectionSource,
    exploreMapSessionActive,
    travelMapSessionActive,
    countryDetailReturnName,
    setCountryDetailReturnName,
  } = useIdentityStore.getState();

  if (selectionSource === "countryDetail" && countryDetailReturnName) {
    const name = countryDetailReturnName;
    setCountryDetailReturnName(null);
    router.dismissTo({
      pathname: "/country/[name]",
      params: { name },
    });
    return;
  }

  if (travelMapSessionActive) {
    markTravelMapSessionDiscardPending();
    router.push("/(tabs)/profile");
    return;
  }

  if (selectionSource === "explore" || exploreMapSessionActive) {
    // Defer store/marker teardown to map blur — clearing selection while the
    // screen is still focused remounts markers into an in-flight animateToRegion.
    markExploreMapSessionDiscardPending();
  }

  router.back();
}
