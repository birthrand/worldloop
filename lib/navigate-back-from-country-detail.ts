import { router } from "expo-router";

import { restoreExploreMapPreviewSession } from "@/lib/explore-map-session";
import { useIdentityStore } from "@/store/use-identity-store";

/** Country detail back — restore explore map preview when opened from there. */
export function navigateBackFromCountryDetail(): void {
  const { countryDetailReturnToMap } = useIdentityStore.getState();

  if (countryDetailReturnToMap) {
    restoreExploreMapPreviewSession();
    router.dismissTo("/(tabs)/map");
    return;
  }

  router.back();
}
