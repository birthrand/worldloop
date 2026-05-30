import {
  resolveBoundaryStrokeOpacity,
  resolveBoundaryStrokeWidth,
  type MapBoundaryStyleSettings,
} from "@/constants/map-boundary-style";
import {
  MAP_CONTINENT_FOCUS_POLYGON_Z,
  MAP_FOCUS_ACCENT,
} from "@/constants/map-continent-focus";
import { hexToRgb, hslToRgb, type RgbColor } from "@/lib/color-utils";

/** Selected-country fill — same amber as map pins (#fbbf24). */
export const GLOBE_COUNTRY_FOCUS_FILL_RGB = MAP_FOCUS_ACCENT;

/** Selected pin glow on 2D markers — country overlay uses the same alpha. */
export const MAP_COUNTRY_FOCUS_FILL_OPACITY = 0.65;

/** Globe 3D selected-country stroke — dark gray outline. */
export const GLOBE_COUNTRY_FOCUS_STROKE_RGB = {
  r: 82,
  g: 82,
  b: 82,
} as const;

/** Minimum stroke width for the selected-country outline at detail zoom. */
export const MAP_COUNTRY_FOCUS_STROKE_WIDTH_MIN = 1.4;

export const MAP_COUNTRY_FOCUS_FADE_MS = 200;

/** Above continent highlight fills. */
export const MAP_COUNTRY_FOCUS_POLYGON_Z = MAP_CONTINENT_FOCUS_POLYGON_Z + 2;

/** Boundary strokes render above the country fill. */
export const MAP_COUNTRY_FOCUS_STROKE_Z = MAP_COUNTRY_FOCUS_POLYGON_Z + 1;

function resolveCountryStrokeRgb(settings: MapBoundaryStyleSettings): RgbColor {
  return (
    (settings.countryStrokeColorHex &&
      hexToRgb(settings.countryStrokeColorHex)) ||
    hslToRgb(settings.countryStrokeColorHue, 0.72, 0.62)
  );
}

function resolveCountryFocusFillAlpha(blendFactor: number): number {
  return Math.min(1, Math.max(0, MAP_COUNTRY_FOCUS_FILL_OPACITY * blendFactor));
}

export function resolveCountryFocusFillRgba(
  settings: MapBoundaryStyleSettings,
  blendFactor: number,
): string {
  if (!settings.countryHighlightEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const { r, g, b } = GLOBE_COUNTRY_FOCUS_FILL_RGB;
  const alpha = resolveCountryFocusFillAlpha(blendFactor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Globe selected-country fill — same amber + pin-matched opacity as 2D. */
export function resolveGlobeCountryFocusFillRgba(
  settings: MapBoundaryStyleSettings,
  blendFactor: number,
): string {
  return resolveCountryFocusFillRgba(settings, blendFactor);
}

/** Brighter edge on the fill polygon so the outline stays visible at country zoom. */
export function resolveCountryFocusStrokeRgba(
  settings: MapBoundaryStyleSettings,
  blendFactor: number,
): string {
  if (!settings.countryHighlightEnabled || !settings.strokeColorEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const rgb = resolveCountryStrokeRgb(settings);
  const baseOpacity = resolveBoundaryStrokeOpacity(settings.strokeOpacityStep);
  const alpha = Math.min(1, Math.max(0, baseOpacity * blendFactor));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Globe-only selected-country stroke — dark gray outline. */
export function resolveGlobeCountryFocusStrokeRgba(
  settings: MapBoundaryStyleSettings,
  blendFactor: number,
): string {
  if (!settings.countryHighlightEnabled || !settings.strokeColorEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const { r, g, b } = GLOBE_COUNTRY_FOCUS_STROKE_RGB;
  const baseOpacity = resolveBoundaryStrokeOpacity(
    settings.countryStrokeOpacityStep,
  );
  const alpha = Math.min(1, Math.max(0, baseOpacity * blendFactor));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Selected-country boundary stroke layer — always visible at country zoom tier. */
export function resolveCountryFocusBoundaryStrokeColor(
  settings: MapBoundaryStyleSettings,
): string {
  if (!settings.countryHighlightEnabled || !settings.strokeColorEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const rgb = resolveCountryStrokeRgb(settings);
  const opacity = resolveBoundaryStrokeOpacity(settings.strokeOpacityStep);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

export function resolveCountryFocusBoundaryStrokeWidth(
  settings: MapBoundaryStyleSettings,
): number {
  if (!settings.countryHighlightEnabled || !settings.strokeColorEnabled) {
    return 0;
  }

  const width = resolveBoundaryStrokeWidth(
    {
      ...settings,
      strokeColorEnabled: true,
      strokeWidthEnabled: true,
      strokeThicknessStep: settings.countryStrokeThicknessStep,
    },
    "country",
  );

  return Math.max(width, MAP_COUNTRY_FOCUS_STROKE_WIDTH_MIN);
}

export function resolveCountryFocusFillStrokeWidth(
  settings: MapBoundaryStyleSettings,
): number {
  if (!settings.countryHighlightEnabled || !settings.strokeColorEnabled) {
    return 0;
  }

  return Math.max(
    resolveCountryFocusBoundaryStrokeWidth(settings) * 0.85,
    MAP_COUNTRY_FOCUS_STROKE_WIDTH_MIN,
  );
}

export function countryFocusStyleRenderKey(
  settings: MapBoundaryStyleSettings,
): string {
  return [
    resolveCountryFocusFillRgba(settings, 1),
    resolveCountryFocusBoundaryStrokeColor(settings),
    resolveCountryFocusBoundaryStrokeWidth(settings),
  ].join("|");
}
