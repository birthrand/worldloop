import type { Region } from "react-native-maps";

import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import {
  isGlobeYellowPinsVisible,
  useMapUiStore,
} from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

/** Toggle to `true` to log map FAB / flight / selection diagnostics (dev only by default). */
export const MAP_DEBUG_ENABLED = __DEV__;

export type MapDebugScope =
  | "fab"
  | "shuffle"
  | "flight"
  | "selection"
  | "intent"
  | "camera"
  | "marker"
  | "reveal"
  | "fatal";

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
    region: country.region,
    latlng,
    coordsValid: isValidLatLng(latlng),
  };
}

/** Current country pin / flag display preference (from persisted map UI store). */
export function summarizeFlagVisibility() {
  const countryMarkerMode = useMapUiStore.getState().countryMarkerMode;
  return {
    countryMarkerMode,
    flagsVisible: countryMarkerMode === "flag",
    globePinsVisible: isGlobeYellowPinsVisible(countryMarkerMode),
    markersHidden: countryMarkerMode === "hidden",
  };
}

export function logMapDebug(
  scope: MapDebugScope,
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!MAP_DEBUG_ENABLED) return;
  const payload = { ...summarizeFlagVisibility(), ...data };
  console.log(`[map:${scope}] ${event}`, payload);
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
      ...summarizeFlagVisibility(),
      isFatal,
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });
    previous?.(error, isFatal);
  });
}
