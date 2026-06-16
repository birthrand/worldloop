import { resetMapPresentation } from "@/lib/map-presentation-transition";
import { useExperienceStore } from "@/store/use-experience-store";
import { useIdentityStore } from "@/store/use-identity-store";
import { useMapPresentationStore } from "@/store/use-map-presentation-store";
import { useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";

/** Re-commit explore → map preview chrome after a country-detail detour. */
export function restoreExploreMapPreviewSession(): void {
  const identity = useIdentityStore.getState();
  identity.setExploreMapSessionActive(true);
  identity.setCountryDetailReturnName(null);

  const activeCountry = identity.activeCountry;
  if (activeCountry) {
    identity.setActiveCountry(activeCountry, "explore");
  }

  useMapPresentationStore.getState().setMode("preview");
}

/** Clears explore → map session state. Call on map blur, not before navigation. */
export function applyExploreMapSessionDiscard(): void {
  const identity = useIdentityStore.getState();
  identity.setExploreMapSessionActive(false);
  identity.setCountryDetailReturnToMap(false);
  identity.clearActiveCountry();

  resetMapPresentation();
  useMapUiStore.getState().resetMapExplorationSession();
  useMapStore.getState().clearPendingMapIntent();
  useExperienceStore.getState().resetExperience();
}

/**
 * Explore → Map session ended — mark pending so the map screen resets on blur.
 * State is cleared in `applyExploreMapSessionDiscard` when the screen loses focus.
 */
export function markExploreMapSessionDiscardPending(): void {
  useMapStore.getState().markExploreSessionDiscardPending();
}
