import {
  MAP_2D_BOUNDARY_CORE_STROKE_SCALE,
  MAP_2D_BOUNDARY_CORE_STROKE_WIDTH_MIN,
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

/**
 * Selected-country fill — faint tint under the outline (stroke-first on map + globe).
 */
export const MAP_COUNTRY_FOCUS_FILL_OPACITY = 0.18;

/** @deprecated Use MAP_COUNTRY_FOCUS_FILL_OPACITY */
export const GLOBE_COUNTRY_FOCUS_FILL_OPACITY = MAP_COUNTRY_FOCUS_FILL_OPACITY;

/** @deprecated Use MAP_2D_BOUNDARY_CORE_STROKE_SCALE from map-boundary-style. */
export const MAP_2D_COUNTRY_FOCUS_CORE_STROKE_SCALE =
  MAP_2D_BOUNDARY_CORE_STROKE_SCALE;

/** @deprecated Use MAP_2D_BOUNDARY_CORE_STROKE_WIDTH_MIN from map-boundary-style. */
export const MAP_2D_COUNTRY_FOCUS_CORE_STROKE_WIDTH_MIN =
  MAP_2D_BOUNDARY_CORE_STROKE_WIDTH_MIN;

/** 2D / globe selection glow opacity vs core stroke. */
export const MAP_COUNTRY_FOCUS_STROKE_GLOW_OPACITY_FACTOR = 0.42;

/** Globe selection outline sits slightly above default boundary strokes. */
export const GLOBE_COUNTRY_FOCUS_STROKE_RADIUS_OFFSET = 1.002;

/** Outer glow pass for the selected-country outline on the globe. */
export const GLOBE_COUNTRY_FOCUS_STROKE_GLOW_RADIUS_OFFSET = 1.0045;

/** Minimum stroke width for the selected-country outline at detail zoom. */
export const MAP_COUNTRY_FOCUS_STROKE_WIDTH_MIN = 1.4;

export const MAP_COUNTRY_FOCUS_FADE_MS = 200;

/** Above continent highlight fills. */
export const MAP_COUNTRY_FOCUS_POLYGON_Z = MAP_CONTINENT_FOCUS_POLYGON_Z + 2;

/** Boundary strokes render above the country fill. */
export const MAP_COUNTRY_FOCUS_STROKE_Z = MAP_COUNTRY_FOCUS_POLYGON_Z + 1;

/** Passport layer — subtle teal ring on visited countries (distinct from gold focus). */
export const MAP_COUNTRY_VISITED_RING_COLOR = "#14b8a6";
export const MAP_COUNTRY_VISITED_RING_OPACITY = 0.72;
export const MAP_COUNTRY_VISITED_FILL_OPACITY = 0.08;

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

/** Optional selection fill — gated by fill toggle in boundary settings. */
export function isCountryFocusFillEnabled(
  settings: MapBoundaryStyleSettings,
): boolean {
  return settings.countryHighlightEnabled && settings.fillEnabled;
}

/** @deprecated Use isCountryFocusFillEnabled */
export const isGlobeCountryFocusFillEnabled = isCountryFocusFillEnabled;

export function resolveCountryFocusFillRgba(
  settings: MapBoundaryStyleSettings,
  blendFactor: number,
): string {
  if (!isCountryFocusFillEnabled(settings)) {
    return "rgba(0, 0, 0, 0)";
  }

  const { r, g, b } = GLOBE_COUNTRY_FOCUS_FILL_RGB;
  const alpha = resolveCountryFocusFillAlpha(blendFactor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** @deprecated Use resolveCountryFocusFillRgba */
export const resolveGlobeCountryFocusFillRgba = resolveCountryFocusFillRgba;

/** Selected-country core outline (primary selection cue). */
export function resolveCountryFocusStrokeRgba(
  settings: MapBoundaryStyleSettings,
  blendFactor: number,
): string {
  if (!settings.countryHighlightEnabled || !settings.strokeColorEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const rgb = resolveCountryStrokeRgb(settings);
  const baseOpacity = resolveBoundaryStrokeOpacity(
    settings.countryStrokeOpacityStep ?? settings.strokeOpacityStep,
  );
  const alpha = Math.min(1, Math.max(0, baseOpacity * blendFactor));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Soft outer glow behind the selection outline. */
export function resolveCountryFocusStrokeGlowRgba(
  settings: MapBoundaryStyleSettings,
  blendFactor: number,
): string {
  if (!settings.countryHighlightEnabled || !settings.strokeColorEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const rgb = resolveCountryStrokeRgb(settings);
  const baseOpacity = resolveBoundaryStrokeOpacity(
    settings.countryStrokeOpacityStep ?? settings.strokeOpacityStep,
  );
  const alpha = Math.min(
    1,
    Math.max(
      0,
      baseOpacity * MAP_COUNTRY_FOCUS_STROKE_GLOW_OPACITY_FACTOR * blendFactor,
    ),
  );
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** @deprecated Use resolveCountryFocusStrokeRgba */
export const resolveGlobeCountryFocusStrokeRgba = resolveCountryFocusStrokeRgba;

/** @deprecated Use resolveCountryFocusStrokeGlowRgba */
export const resolveGlobeCountryFocusStrokeGlowRgba =
  resolveCountryFocusStrokeGlowRgba;

/** Selected-country boundary stroke layer — always visible at country zoom tier. */
export function resolveCountryFocusBoundaryStrokeColor(
  settings: MapBoundaryStyleSettings,
): string {
  if (!settings.countryHighlightEnabled || !settings.strokeColorEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const rgb = resolveCountryStrokeRgb(settings);
  const opacity = resolveBoundaryStrokeOpacity(
    settings.countryStrokeOpacityStep ?? settings.strokeOpacityStep,
  );
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

/** Core selection outline width on the 2D map (thinner than boundary preview). */
export function resolveCountryFocusCoreStrokeWidth(
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

  const scaled = width * MAP_2D_BOUNDARY_CORE_STROKE_SCALE;
  return Math.max(scaled, MAP_2D_BOUNDARY_CORE_STROKE_WIDTH_MIN);
}

/** @deprecated Use resolveCountryFocusCoreStrokeWidth */
export const resolveCountryFocusFillStrokeWidth =
  resolveCountryFocusCoreStrokeWidth;

export function countryFocusStyleRenderKey(
  settings: MapBoundaryStyleSettings,
): string {
  return [
    resolveCountryFocusFillRgba(settings, 1),
    resolveCountryFocusBoundaryStrokeColor(settings),
    resolveCountryFocusCoreStrokeWidth(settings),
  ].join("|");
}
