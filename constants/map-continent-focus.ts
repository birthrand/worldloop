import type { LatLng } from "react-native-maps";

/** Brand accent — matches `--color-tab-active` / map pins. */
export const MAP_FOCUS_ACCENT = {
  r: 251,
  g: 191,
  b: 36,
} as const;

/** Deep navy scrim — matches `--color-midnight-navy`. */
export const MAP_FOCUS_SCRIM = {
  r: 11,
  g: 19,
  b: 43,
} as const;

/** Target fill opacity at full blend (0–1) — matches boundary fill step 2 (0.20). */
export const MAP_CONTINENT_FOCUS_FILL_OPACITY = 0.2;
export const MAP_SCRIM_MAX_OPACITY = 0.12;

/** Softer continent wash when a country pin is already selected. */
export const MAP_CONTINENT_FOCUS_FILL_OPACITY_WITH_COUNTRY = 0.12;
export const MAP_SCRIM_MAX_OPACITY_WITH_COUNTRY = 0.08;

/** Softer highlight while continent intent is pending (before commit). */
export const MAP_CONTINENT_PREVIEW_FILL_OPACITY = 0.13;
export const MAP_CONTINENT_PREVIEW_SCRIM_OPACITY = 0.05;

/** Pause before committing continent focus (ms). */
export const MAP_CONTINENT_INTENT_DELAY_MS = 200;

/** Ignore taps when orbit/pan finger movement exceeds this (px). */
export const MAP_TAP_DRAG_THRESHOLD_PX = 10;

export const MAP_CONTINENT_FOCUS_FADE_MS = 250;

export const MAP_CONTINENT_FOCUS_SCRIM_Z = 2;
export const MAP_CONTINENT_FOCUS_POLYGON_Z = 3;

/** Covers the visible map; rendered below continent highlight polygons. */
export const MAP_WORLD_SCRIM_RING: LatLng[] = [
  { latitude: 85, longitude: -180 },
  { latitude: 85, longitude: 180 },
  { latitude: -85, longitude: 180 },
  { latitude: -85, longitude: -180 },
];

export function mapFocusAccentRgba(alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${MAP_FOCUS_ACCENT.r}, ${MAP_FOCUS_ACCENT.g}, ${MAP_FOCUS_ACCENT.b}, ${a})`;
}

export function mapFocusScrimRgba(alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${MAP_FOCUS_SCRIM.r}, ${MAP_FOCUS_SCRIM.g}, ${MAP_FOCUS_SCRIM.b}, ${a})`;
}

/** Scales boundary fill opacity for committed continent focus (with optional country pin). */
export function continentFocusFillOpacityFactor(
  withSelectedCountry: boolean,
): number {
  if (!withSelectedCountry) return 1;
  return (
    MAP_CONTINENT_FOCUS_FILL_OPACITY_WITH_COUNTRY /
    MAP_CONTINENT_FOCUS_FILL_OPACITY
  );
}

/** Scales boundary fill opacity for pending continent preview. */
export function continentPreviewFillOpacityFactor(): number {
  return MAP_CONTINENT_PREVIEW_FILL_OPACITY / MAP_CONTINENT_FOCUS_FILL_OPACITY;
}
