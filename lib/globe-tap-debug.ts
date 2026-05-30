import type { CameraZoomTier } from "@/lib/map-camera-zoom";
import type { MapPressCoordinate } from "@/lib/map-map-tap-hit";

/** Dev-only traces for 3D globe tap routing (country vs continent). */
export const GLOBE_TAP_DEBUG = __DEV__;

export type GlobeTapSource = "surface" | "boundary-mesh" | "controller";

export type GlobeTapLogPayload = {
  source: GlobeTapSource;
  /** Pipeline stage — raw input, routing decision, or executed action. */
  stage: "input" | "routing" | "action" | "skip";
  /** Short outcome label for grep-friendly logs. */
  outcome: string;
  coordinate?: MapPressCoordinate;
  country?: string | null;
  region?: string | null;
  focusedRegion?: string | null;
  boundaryFocusRegion?: string | null;
  cameraTier?: CameraZoomTier;
  globeDistance?: number;
  /** Routing booleans and other debug context. */
  flags?: Record<string, boolean | string | number | null | undefined>;
};

export function logGlobeTap(payload: GlobeTapLogPayload): void {
  if (!GLOBE_TAP_DEBUG) return;

  const { source, stage, outcome, coordinate, flags, ...rest } = payload;

  console.log("[globe-tap]", outcome, {
    source,
    stage,
    ...(coordinate
      ? {
          lat: +coordinate.latitude.toFixed(2),
          lng: +coordinate.longitude.toFixed(2),
        }
      : {}),
    ...rest,
    ...(flags && Object.keys(flags).length > 0 ? { flags } : {}),
  });
}
