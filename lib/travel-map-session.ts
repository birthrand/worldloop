import { resetMapPresentation } from "@/lib/map-presentation-transition";
import { useExperienceStore } from "@/store/use-experience-store";
import { useIdentityStore } from "@/store/use-identity-store";
import { useMapLandmarkFocusStore } from "@/store/use-map-landmark-focus-store";
import { useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useTravelMapLegendStore } from "@/store/use-travel-map-legend-store";

/** Clears profile → travel map session state. Call on map blur, not before navigation. */
export function applyTravelMapSessionDiscard(): void {
  const identity = useIdentityStore.getState();
  identity.setTravelMapSessionActive(false);
  identity.setTravelLandmarkPreviewPinId(null);
  identity.clearActiveCountry();

  useMapLandmarkFocusStore.getState().clearActiveLandmark();
  resetMapPresentation();
  useMapUiStore.getState().resetMapExplorationSession();
  useTravelMapLegendStore.getState().resetFilters();
  useMapStore.getState().clearPendingMapIntent();
  useExperienceStore.getState().resetExperience();
}

/** Profile → travel map ended — reset on map blur. */
export function markTravelMapSessionDiscardPending(): void {
  useMapStore.getState().markTravelSessionDiscardPending();
}

/** Re-commit travel map session after a country-detail detour from a landmark preview. */
export function restoreTravelMapLandmarkPreviewSession(): void {
  const identity = useIdentityStore.getState();
  identity.setTravelMapSessionActive(true);
  identity.setCountryDetailReturnName(null);
  identity.setCountryDetailReturnToMap(true);
}
