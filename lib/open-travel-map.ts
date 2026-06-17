import { router } from "expo-router";

import { useIdentityStore } from "@/store/use-identity-store";
import { useMapLandmarkFocusStore } from "@/store/use-map-landmark-focus-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useTravelMapLegendStore } from "@/store/use-travel-map-legend-store";

/** Profile → travel map: personal pins only, no random country discovery. */
export function openTravelMap(): void {
  const identity = useIdentityStore.getState();
  identity.setExploreMapSessionActive(false);
  identity.setCountryDetailReturnName(null);
  identity.setCountryDetailReturnToMap(false);
  identity.setTravelLandmarkPreviewPinId(null);
  identity.clearActiveCountry();
  identity.setTravelMapSessionActive(true);

  useMapLandmarkFocusStore.getState().clearActiveLandmark();

  const mapUi = useMapUiStore.getState();
  mapUi.setFocusedRegion(null);
  mapUi.setDisplayMode("globalPulse");
  mapUi.setCountryMarkerMode("flag");
  useTravelMapLegendStore.getState().resetFilters();

  router.push("/(tabs)/map");
}
