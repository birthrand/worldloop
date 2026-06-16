import type { Region } from "react-native-maps";

import { CONTINENT_CONTEXT_LATITUDE_DELTA } from "@/constants/map-focus-tiers";
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
 * focus tiers (see `constants/map-focus-tiers.ts`), marker density, UI scaling.
 * Camera tier strings: `world` = Tier 0, `region` = Tier 1 Country Focus, `country` = Tier 2 Detail.
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

/** Intent + live camera: map tap may start continent focus only at world zoom. */
export function canFocusContinentFromMapTap(
  _is3d: boolean,
  _focusedRegion: string | null,
  cameraTier: CameraZoomTier,
): boolean {
  return cameraTier === "world";
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
  boundaryFocusRegion: string | null,
  cameraTier: CameraZoomTier,
  options?: { allowWorldZoomGlobe?: boolean },
): boolean {
  if (!boundaryFocusRegion) return false;
  if (cameraTier !== "world") return true;
  return options?.allowWorldZoomGlobe === true;
}

/** Nearest app region label for a map center (continent cluster). */
export function resolveNearestRegionFromCenter(
  clusters: MapCluster[],
  latitude: number,
  longitude: number,
): string | null {
  if (
    clusters.length === 0 ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  let nearest: MapCluster | null = null;
  let best = Number.POSITIVE_INFINITY;

  for (const cluster of clusters) {
    const dLat = cluster.center[0] - latitude;
    const dLng = cluster.center[1] - longitude;
    const d = dLat * dLat + dLng * dLng;
    if (d < best) {
      best = d;
      nearest = cluster;
    }
  }

  return nearest?.region ?? null;
}

/**
 * Region used for boundary outlines + tap targets.
 * Matches 2D: committed continent intent, then world-preview intent — never inferred.
 */
export function resolveEffectiveBoundaryRegion(input: {
  focusedRegion: string | null;
  previewRegion: string | null;
}): string | null {
  return input.focusedRegion ?? input.previewRegion;
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

/** Continent-tier zoom centered on the selected country (not the cluster centroid). */
export function flightRegionForContinentContextCountry(
  country: Pick<MapCountry, "name" | "latlng" | "region">,
): MapRegionSnapshot {
  return regionForMapCountry(country, CONTINENT_CONTEXT_LATITUDE_DELTA);
}

export function flightRegionForWorldViewCountry(
  country: MapCountry,
): MapRegionSnapshot {
  return regionForWorldViewCountry(country);
}
