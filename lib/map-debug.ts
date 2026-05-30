import type { Region } from "react-native-maps";

import {
  type CameraZoomState,
  type CameraZoomTier,
  FLAT_WORLD_LATITUDE_DELTA,
} from "@/lib/map-camera-zoom";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import { showCountryFocusPill, showRegionChrome } from "@/lib/map-presentation";
import {
  GLOBE_WORLD_ZOOM_DISTANCE,
  MAP_COUNTRY_ZOOM_LATITUDE_DELTA,
} from "@/lib/map-region-markers";
import {
  buildNavigationDebugLogFields,
  mapTriggerToPressedButton,
  type ScreenSwitchInfo,
} from "@/lib/navigation-debug";
import type { SelectionSource } from "@/store/use-identity-store";
import type { MapCountry } from "@/types/country";
import type { MapPresentationMode } from "@/types/map-presentation";

/** Toggle map interaction diagnostics (dev only by default). */
export const MAP_DEBUG_ENABLED = __DEV__;

/** Matches `globe-view.tsx` Canvas camera — used for 3D visible-extent math. */
export const GLOBE_CAMERA_FOV_DEGREES = 42;
/** Unit-sphere radius in the 3D globe scene. */
export const GLOBE_SPHERE_RADIUS = 1;

const WORLD_LATITUDE_SPAN_DEGREES = 180;
const WORLD_LONGITUDE_SPAN_DEGREES = 360;

export type MapVisibleBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type MapVisibleExtent = {
  /** Axis-aligned bounds of the viewport in WGS84 degrees. */
  bounds: MapVisibleBounds;
  /** Visible span along latitude and longitude (degrees). */
  span: {
    latitudeDegrees: number;
    longitudeDegrees: number;
  };
  /** Fraction of the world meridional span (180° pole-to-pole). */
  worldLatitudeFraction: number;
  /** Fraction of the world zonal span at the equator (360°). */
  worldLongitudeFraction: number;
  /** latFraction × lngFraction — share of the full equirectangular map. */
  equirectangularAreaFraction: number;
  /** For 3D globe only: fraction of the sphere's surface area in view. */
  globeSurfaceFraction?: number;
  /** Same fractions as percentages (fraction × 100). */
  coveragePercent: {
    latitude: number;
    longitude: number;
    equirectangularArea: number;
    globeSurface?: number;
  };
};

function buildCoverageFromSpan(
  latitudeDegrees: number,
  longitudeDegrees: number,
  globeSurfaceFraction?: number,
): Pick<
  MapVisibleExtent,
  | "worldLatitudeFraction"
  | "worldLongitudeFraction"
  | "equirectangularAreaFraction"
  | "globeSurfaceFraction"
  | "coveragePercent"
> {
  const worldLatitudeFraction = latitudeDegrees / WORLD_LATITUDE_SPAN_DEGREES;
  const worldLongitudeFraction =
    longitudeDegrees / WORLD_LONGITUDE_SPAN_DEGREES;
  const equirectangularAreaFraction =
    worldLatitudeFraction * worldLongitudeFraction;

  return {
    worldLatitudeFraction,
    worldLongitudeFraction,
    equirectangularAreaFraction,
    globeSurfaceFraction,
    coveragePercent: {
      latitude: worldLatitudeFraction * 100,
      longitude: worldLongitudeFraction * 100,
      equirectangularArea: equirectangularAreaFraction * 100,
      ...(globeSurfaceFraction !== undefined
        ? { globeSurface: globeSurfaceFraction * 100 }
        : {}),
    },
  };
}

function buildBoundsFromCenterAndSpan(
  centerLat: number,
  centerLng: number,
  latitudeDegrees: number,
  longitudeDegrees: number,
): MapVisibleBounds {
  const halfLat = latitudeDegrees / 2;
  const halfLng = longitudeDegrees / 2;

  return {
    north: Math.min(90, centerLat + halfLat),
    south: Math.max(-90, centerLat - halfLat),
    east: centerLng + halfLng,
    west: centerLng - halfLng,
  };
}

/** Exact flat-map viewport extent from a react-native-maps `Region`. */
export function computeFlatMapVisibleExtent(
  centerLat: number,
  centerLng: number,
  latitudeDelta: number,
  longitudeDelta: number,
): MapVisibleExtent {
  const latitudeDegrees = Math.min(
    WORLD_LATITUDE_SPAN_DEGREES,
    Math.max(0, latitudeDelta),
  );
  const longitudeDegrees = Math.min(
    WORLD_LONGITUDE_SPAN_DEGREES,
    Math.max(0, longitudeDelta),
  );

  return {
    bounds: buildBoundsFromCenterAndSpan(
      centerLat,
      centerLng,
      latitudeDegrees,
      longitudeDegrees,
    ),
    span: {
      latitudeDegrees,
      longitudeDegrees,
    },
    ...buildCoverageFromSpan(latitudeDegrees, longitudeDegrees),
  };
}

/** 3D globe viewport extent from live camera distance + FOV. */
export function computeGlobeMapVisibleExtent(
  centerLat: number,
  centerLng: number,
  cameraDistance: number,
  fovDegrees = GLOBE_CAMERA_FOV_DEGREES,
  sphereRadius = GLOBE_SPHERE_RADIUS,
): MapVisibleExtent {
  const d = cameraDistance;
  const r = sphereRadius;
  const halfFovRad = ((fovDegrees / 2) * Math.PI) / 180;

  if (!Number.isFinite(d) || d <= r) {
    return {
      bounds: buildBoundsFromCenterAndSpan(centerLat, centerLng, 180, 360),
      span: { latitudeDegrees: 180, longitudeDegrees: 360 },
      ...buildCoverageFromSpan(180, 360, 1),
    };
  }

  const apparentHalfRad = Math.asin(Math.min(1, r / d));
  const apparentDiameterRad = apparentHalfRad * 2;
  const fovDiameterRad = halfFovRad * 2;

  if (apparentDiameterRad <= fovDiameterRad) {
    return {
      bounds: buildBoundsFromCenterAndSpan(centerLat, centerLng, 180, 360),
      span: { latitudeDegrees: 180, longitudeDegrees: 360 },
      ...buildCoverageFromSpan(180, 360, 1),
    };
  }

  const closestApproach = d - r;
  const frustumHalfWidthAtClosest = closestApproach * Math.tan(halfFovRad);
  const visibleHalfRad = Math.atan(frustumHalfWidthAtClosest / r);
  const latitudeDegrees = Math.min(
    WORLD_LATITUDE_SPAN_DEGREES,
    (visibleHalfRad * 2 * 180) / Math.PI,
  );
  const longitudeDegrees = Math.min(
    WORLD_LONGITUDE_SPAN_DEGREES,
    (visibleHalfRad * 2 * 180) / Math.PI,
  );
  const globeSurfaceFraction = (1 - Math.cos(visibleHalfRad)) / 2;

  return {
    bounds: buildBoundsFromCenterAndSpan(
      centerLat,
      centerLng,
      latitudeDegrees,
      longitudeDegrees,
    ),
    span: {
      latitudeDegrees,
      longitudeDegrees,
    },
    ...buildCoverageFromSpan(
      latitudeDegrees,
      longitudeDegrees,
      globeSurfaceFraction,
    ),
  };
}

export function computeMapVisibleExtent(input: {
  is3d: boolean;
  centerLat: number;
  centerLng: number;
  latitudeDelta: number;
  longitudeDelta: number;
  globeCameraDistance: number;
}): MapVisibleExtent {
  if (input.is3d) {
    return computeGlobeMapVisibleExtent(
      input.centerLat,
      input.centerLng,
      input.globeCameraDistance,
    );
  }

  return computeFlatMapVisibleExtent(
    input.centerLat,
    input.centerLng,
    input.latitudeDelta,
    input.longitudeDelta,
  );
}

export function summarizeRegion(region: Region) {
  const finite =
    Number.isFinite(region.latitude) &&
    Number.isFinite(region.longitude) &&
    Number.isFinite(region.latitudeDelta) &&
    Number.isFinite(region.longitudeDelta);

  return {
    lat: region.latitude,
    lng: region.longitude,
    latDelta: region.latitudeDelta,
    lngDelta: region.longitudeDelta,
    finite,
  };
}

export function summarizeCountry(country: MapCountry | null | undefined) {
  if (!country) return null;
  const latlng = getMapDisplayLatLng(country);
  return {
    name: country.name,
    continent: country.region,
    capital: country.capital,
    latlng,
    coordsValid: isValidLatLng(latlng),
  };
}

export type MapInteractionSource =
  | "mapTap"
  | "boundaryTap"
  | "markerTap"
  | "selection"
  | "deselection"
  | "fab"
  | "shuffle";

/** How the user initiated the interaction (map surface vs chrome controls). */
export type MapInteractionTrigger =
  | "mapPress"
  | "boundaryPress"
  | "markerPress"
  | "fab"
  | "shuffle"
  | "deselection"
  | "selection"
  | "other";

/** Live camera pan/zoom snapshot for verifying `cameraTier`. */
export type MapViewportSnapshot = {
  projection: "2d" | "3d";
  pan: { latitude: number; longitude: number };
  zoom: {
    latitudeDelta: number;
    longitudeDelta: number;
    globeDistance: number | null;
  };
  derivedTier: CameraZoomTier;
  isDetailZoom: boolean;
  /** True when `derivedTier` matches the hook's `cameraTier` at log time. */
  tierMatchesCameraTier: boolean;
  tierInputs: {
    flatLatitudeDelta: number;
    flatWorldThreshold: number;
    flatCountryThreshold: number;
    globeDistance: number | null;
    globeWorldThreshold: number;
  };
  /** Exact geographic bounds + world-coverage fractions for the current viewport. */
  visibleExtent: MapVisibleExtent;
};

export type MapInteractionLogContext = {
  viewport: MapViewportSnapshot;
  cameraTier: CameraZoomTier;
  is3d: boolean;
  mapMode: string;
};

export function buildMapViewportSnapshot({
  is3d,
  cameraTier,
  cameraZoomState,
  lastMapRegion,
  globeCameraDistance,
  globeViewCenter,
}: {
  is3d: boolean;
  cameraTier: CameraZoomTier;
  cameraZoomState: CameraZoomState;
  lastMapRegion: Region;
  globeCameraDistance: number;
  globeViewCenter: { latitude: number; longitude: number };
}): MapViewportSnapshot {
  const pan = is3d
    ? {
        latitude: globeViewCenter.latitude,
        longitude: globeViewCenter.longitude,
      }
    : {
        latitude: lastMapRegion.latitude,
        longitude: lastMapRegion.longitude,
      };

  const visibleExtent = computeMapVisibleExtent({
    is3d,
    centerLat: pan.latitude,
    centerLng: pan.longitude,
    latitudeDelta: lastMapRegion.latitudeDelta,
    longitudeDelta: lastMapRegion.longitudeDelta,
    globeCameraDistance,
  });

  return {
    projection: is3d ? "3d" : "2d",
    pan,
    zoom: {
      latitudeDelta: lastMapRegion.latitudeDelta,
      longitudeDelta: lastMapRegion.longitudeDelta,
      globeDistance: is3d ? globeCameraDistance : null,
    },
    derivedTier: cameraZoomState.tier,
    isDetailZoom: cameraZoomState.isDetailZoom,
    tierMatchesCameraTier: cameraTier === cameraZoomState.tier,
    tierInputs: {
      flatLatitudeDelta: lastMapRegion.latitudeDelta,
      flatWorldThreshold: FLAT_WORLD_LATITUDE_DELTA,
      flatCountryThreshold: MAP_COUNTRY_ZOOM_LATITUDE_DELTA,
      globeDistance: is3d ? globeCameraDistance : null,
      globeWorldThreshold: GLOBE_WORLD_ZOOM_DISTANCE,
    },
    visibleExtent,
  };
}

export function buildMapInteractionLogContext({
  is3d,
  mapMode,
  cameraTier,
  cameraZoomState,
  lastMapRegion,
  globeCameraDistance,
  globeViewCenter,
}: {
  is3d: boolean;
  mapMode: string;
  cameraTier: CameraZoomTier;
  cameraZoomState: CameraZoomState;
  lastMapRegion: Region;
  globeCameraDistance: number;
  globeViewCenter: { latitude: number; longitude: number };
}): MapInteractionLogContext {
  return {
    viewport: buildMapViewportSnapshot({
      is3d,
      cameraTier,
      cameraZoomState,
      lastMapRegion,
      globeCameraDistance,
      globeViewCenter,
    }),
    cameraTier,
    is3d,
    mapMode,
  };
}

export function selectionSourceToTrigger(
  source: Exclude<SelectionSource, null>,
): MapInteractionTrigger {
  switch (source) {
    case "fab":
      return "fab";
    case "shuffle":
      return "shuffle";
    case "mapTap":
      return "markerPress";
    case "search":
    case "explore":
      return "selection";
    default:
      return "other";
  }
}

export function selectionSourceToInteractionSource(
  source: Exclude<SelectionSource, null>,
): MapInteractionSource {
  if (source === "fab") return "fab";
  if (source === "shuffle") return "shuffle";
  return "selection";
}

export type MapInteractionLog = MapInteractionLogContext & {
  action: string;
  source: MapInteractionSource;
  trigger?: MapInteractionTrigger;
  /** Country under the tap, if any. */
  tappedCountry?: MapCountry | null;
  /** Continent for the tap target (from country or cluster). */
  tappedContinent?: string | null;
  /** Currently selected / active country. */
  selectedCountry?: MapCountry | null;
  /** True when tapped country matches the active selection. */
  isSelected?: boolean;
  /** Continent the map UI is focused on. */
  focusedContinent?: string | null;
  /** Committed continent overlay region (may lag focusedContinent). */
  continentOverlay?: string | null;
  coordinate?: { latitude: number; longitude: number } | null;
  presentationMode?: string;
  isPreviewOpen?: boolean;
  isExploreZoom?: boolean;
  /** Continent region chips chrome (top bar). Overrides derived value when set. */
  showRegionChrome?: boolean;
  /** Country focus pill chrome. Overrides derived value when set. */
  showCountryFocusPill?: boolean;
  /** Control pressed for this interaction (overrides trigger → button mapping). */
  pressedButton?: string | null;
  /** When this interaction changes app tab or map scene. */
  screenSwitch?: ScreenSwitchInfo | null;
  extra?: Record<string, unknown>;
};

/** Same rules as `map.tsx` — continent chips vs country focus pill. */
export function resolveMapChromeVisibility(log: {
  focusedContinent?: string | null;
  selectedCountry?: MapCountry | null;
  presentationMode?: string;
  showRegionChrome?: boolean;
  showCountryFocusPill?: boolean;
}): { showRegionChrome: boolean; showCountryFocusPill: boolean } {
  const mode = (log.presentationMode ?? "idle") as MapPresentationMode;
  const focusedRegion = log.focusedContinent ?? null;
  const activeCountry = log.selectedCountry ?? null;

  return {
    showRegionChrome:
      log.showRegionChrome ??
      showRegionChrome(focusedRegion, mode, activeCountry),
    showCountryFocusPill:
      log.showCountryFocusPill ?? showCountryFocusPill(mode, activeCountry),
  };
}

/** Logs country tap, continent, selection state, and map context. */
export function logMapInteraction(log: MapInteractionLog): void {
  if (!MAP_DEBUG_ENABLED) return;

  const tapped = summarizeCountry(log.tappedCountry);
  const selected = summarizeCountry(log.selectedCountry);
  const isSelected =
    log.isSelected ??
    (tapped !== null && selected !== null && tapped.name === selected.name);

  const chrome = resolveMapChromeVisibility(log);
  const navigation = buildNavigationDebugLogFields({
    pressedButton:
      log.pressedButton ?? mapTriggerToPressedButton(log.trigger) ?? null,
    screenSwitch: log.screenSwitch ?? null,
  });
  const viewport = log.viewport;
  const regionSummary = summarizeRegion({
    latitude: viewport.pan.latitude,
    longitude: viewport.pan.longitude,
    latitudeDelta: viewport.zoom.latitudeDelta,
    longitudeDelta: viewport.zoom.longitudeDelta,
  });

  console.log(`[map:${log.source}] ${log.action}`, {
    trigger: log.trigger ?? null,
    tappedCountry: tapped?.name ?? null,
    tappedContinent: log.tappedContinent ?? tapped?.continent ?? null,
    selectedCountry: selected?.name ?? null,
    selectedContinent: selected?.continent ?? null,
    isSelected,
    focusedContinent: log.focusedContinent ?? null,
    continentOverlay: log.continentOverlay ?? null,
    coordinate: log.coordinate ?? null,
    cameraTier: log.cameraTier ?? null,
    viewportDerivedTier: viewport.derivedTier,
    tierMatchesCameraTier: viewport.tierMatchesCameraTier,
    pan: viewport.pan,
    zoom: viewport.zoom,
    viewportProjection: viewport.projection,
    isDetailZoom: viewport.isDetailZoom,
    tierInputs: viewport.tierInputs,
    region: regionSummary,
    visibleExtent: viewport.visibleExtent,
    mapVisibleBounds: viewport.visibleExtent.bounds,
    mapVisibleSpan: viewport.visibleExtent.span,
    mapVisibleCoveragePercent: viewport.visibleExtent.coveragePercent,
    mapMode: log.mapMode ?? null,
    presentationMode: log.presentationMode ?? null,
    isPreviewOpen: log.isPreviewOpen ?? false,
    showRegionChrome: chrome.showRegionChrome,
    showCountryFocusPill: chrome.showCountryFocusPill,
    currentScreen: navigation.currentScreen,
    previousScreen: navigation.previousScreen,
    mapScene: navigation.mapScene,
    previousMapScene: navigation.previousMapScene,
    pressedButton: navigation.pressedButton,
    screenSwitch: navigation.screenSwitch,
    isExploreZoom: log.isExploreZoom ?? false,
    is3d: log.is3d ?? false,
    tappedDetail: tapped,
    selectedDetail: selected,
    ...log.extra,
  });
}

type ErrorUtilsLike = {
  getGlobalHandler?: () =>
    | ((error: unknown, isFatal?: boolean) => void)
    | undefined;
  setGlobalHandler?: (
    handler: (error: unknown, isFatal?: boolean) => void,
  ) => void;
};

let mapDebugErrorHandlerInstalled = false;

/**
 * Installs a global JS error handler that logs the error + stack before the app
 * dies. Helps capture the cause of map crashes that otherwise show no JS trace.
 * Chains to the previous handler so default red-box / crash behavior is preserved.
 */
export function installMapDebugErrorHandler(): void {
  if (!MAP_DEBUG_ENABLED || mapDebugErrorHandlerInstalled) return;

  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  mapDebugErrorHandlerInstalled = true;
  const previous = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error, isFatal) => {
    const err = error as { name?: string; message?: string; stack?: string };
    console.log("[map:fatal] global JS error", {
      isFatal,
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });
    previous?.(error, isFatal);
  });
}
