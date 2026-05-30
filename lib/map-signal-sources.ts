import type { Region } from "react-native-maps";

import {
  regionForClusterFocus,
  regionForMapCountry,
  regionForWorldViewCountry,
} from "@/constants/map-regions";
import type { CameraZoomTier } from "@/lib/map-camera-zoom";
import type { MapCluster } from "@/lib/map-clusters";
import type { MapCountry } from "@/types/country";
import type { MapPresentationMode } from "@/types/map-presentation";

/**
 * Map screen signal sources — use the right input for each decision:
 *
 * **Live camera** (`cameraTier`, `latitudeDelta`, `globeDistance`):
 * zoom tier, marker density, UI scaling, explore-vs-world behavior.
 *
 * **`focusedRegion`** + **`presentationMode`** / active country:
 * tap routing, what is selected, continent navigation targets.
 *
 * **`presentationMode`** (+ active country):
 * UI chrome — preview sheet, focus pill, overlays, tab bar.
 *
 * **Region snapshot** (`MapRegionSnapshot`, flight phases only):
 * animation setup, camera interpolation, flight destinations — never for
 * density, chrome, or tap routing while the camera is still moving.
 */

/** Camera target for flat-map flights — not a substitute for live zoom tier. */
export type MapRegionSnapshot = Region;

/** Live-camera: continent explore mode (focused + not at world zoom). */
export function isExploreMapZoom(
  focusedRegion: string | null,
  cameraTier: CameraZoomTier,
): boolean {
  return !!focusedRegion && cameraTier !== "world";
}

/**
 * Map tap on a country inside the focused continent selects that country
 * (explore zoom, or world camera while continent intent is still active).
 */
export function shouldSelectCountryInFocusedContinentFromMapTap(input: {
  focusedRegion: string | null;
  tappedCountry: MapCountry;
  cameraTier: CameraZoomTier;
}): boolean {
  if (
    !input.focusedRegion ||
    input.tappedCountry.region !== input.focusedRegion
  ) {
    return false;
  }
  return (
    isExploreMapZoom(input.focusedRegion, input.cameraTier) ||
    input.cameraTier === "world"
  );
}

/**
 * Resolved country polygon while another continent is focused — select the
 * country (fly + update intent), not continent-only navigation.
 */
export function shouldSelectCountryAcrossFocusedContinentFromMapTap(input: {
  focusedRegion: string | null;
  tappedCountry: MapCountry;
}): boolean {
  return (
    !!input.focusedRegion && input.tappedCountry.region !== input.focusedRegion
  );
}

/**
 * Intent-first: while a country is in focus, same-continent map taps select
 * the tapped country (even at world camera tier — e.g. Explore handoff).
 */
export function shouldDelegateMapTapToCountrySelection(input: {
  presentationMode: MapPresentationMode;
  activeCountry: MapCountry | null;
  focusedRegion: string | null;
  tappedCountry: MapCountry;
}): boolean {
  if (input.presentationMode !== "focus" || !input.activeCountry) {
    return false;
  }
  const focusedContinent = input.focusedRegion ?? input.activeCountry.region;
  return input.tappedCountry.region === focusedContinent;
}

/** Intent + live camera: map tap may start a new continent focus from world/3D. */
export function canFocusContinentFromMapTap(
  is3d: boolean,
  focusedRegion: string | null,
  cameraTier: CameraZoomTier,
): boolean {
  return is3d || cameraTier === "world" || !focusedRegion;
}

/** Block continent re-focus when the same continent is already active at world zoom. */
export function canRefocusContinentFromMapTap(
  focusedRegion: string | null,
  tappedContinent: string | null,
  cameraTier: CameraZoomTier,
): boolean {
  if (
    focusedRegion &&
    tappedContinent === focusedRegion &&
    cameraTier === "world"
  ) {
    return false;
  }
  return true;
}

/** Live camera: show world onboarding (world zoom, no selection). */
export function shouldShowMapOnboarding(input: {
  is3d: boolean;
  cameraTier: CameraZoomTier;
  status: string;
  countryCount: number;
  hasActiveCountry: boolean;
  hasFocusTransition: boolean;
}): boolean {
  return (
    (input.is3d || input.cameraTier === "world") &&
    input.status !== "loading" &&
    input.countryCount > 0 &&
    !input.hasActiveCountry &&
    !input.hasFocusTransition
  );
}

/** Live camera: featured chips vs region filter chips in top chrome. */
export function shouldShowFeaturedChipsInMapChrome(
  is3d: boolean,
  cameraTier: CameraZoomTier,
  focusedRegion: string | null,
): boolean {
  return is3d || cameraTier === "world" || !focusedRegion;
}

/** Intent + live camera: country boundaries accept taps in explore zoom. */
export function areRegionBoundariesTappable(
  focusedRegion: string | null,
  cameraTier: CameraZoomTier,
): boolean {
  return !!focusedRegion && cameraTier !== "world";
}

// --- Region snapshots (flights / interpolation only) ---

export function flightRegionForClusterFocus(
  cluster: MapCluster,
): MapRegionSnapshot {
  return regionForClusterFocus(cluster);
}

export function flightRegionForCountry(
  country: MapCountry,
  latitudeDelta?: number,
): MapRegionSnapshot {
  return regionForMapCountry(country, latitudeDelta);
}

export function flightRegionForWorldViewCountry(
  country: MapCountry,
): MapRegionSnapshot {
  return regionForWorldViewCountry(country);
}
