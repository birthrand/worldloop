import { router } from "expo-router";

import { markExploreMapSessionDiscardPending } from "@/lib/explore-map-session";
import { useIdentityStore } from "@/store/use-identity-store";

/** Map back — restore country detail when the map was opened from there. */
export function navigateBackFromMap(): void {
  const {
    selectionSource,
    exploreMapSessionActive,
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

  if (selectionSource === "explore" || exploreMapSessionActive) {
    // Defer store/marker teardown to map blur — clearing selection while the
    // screen is still focused remounts markers into an in-flight animateToRegion.
    markExploreMapSessionDiscardPending();
  }

  router.back();
}
