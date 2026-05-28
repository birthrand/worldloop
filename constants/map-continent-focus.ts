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

/** Target fill opacity at full blend (0–1). */
export const MAP_CONTINENT_FOCUS_FILL_OPACITY = 0.18;
export const MAP_SCRIM_MAX_OPACITY = 0.09;

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
