import {
  resolveBoundaryFillOpacity,
  resolveBoundaryStrokeOpacity,
  resolveBoundaryStrokeWidth,
  type MapBoundaryStyleSettings,
} from "@/constants/map-boundary-style";
import { MAP_CONTINENT_FOCUS_POLYGON_Z } from "@/constants/map-continent-focus";
import { hexToRgb, hslToRgb, type RgbColor } from "@/lib/color-utils";

/** Minimum stroke width for the selected-country outline at detail zoom. */
export const MAP_COUNTRY_FOCUS_STROKE_WIDTH_MIN = 1.4;

export const MAP_COUNTRY_FOCUS_FADE_MS = 200;

/** Above continent highlight fills. */
export const MAP_COUNTRY_FOCUS_POLYGON_Z = MAP_CONTINENT_FOCUS_POLYGON_Z + 2;

/** Boundary strokes render above the country fill. */
export const MAP_COUNTRY_FOCUS_STROKE_Z = MAP_COUNTRY_FOCUS_POLYGON_Z + 1;

function resolveCountryFillRgb(settings: MapBoundaryStyleSettings): RgbColor {
  return (
    (settings.countryFillColorHex && hexToRgb(settings.countryFillColorHex)) ||
    hslToRgb(settings.countryFillColorHue, 0.85, 0.58)
  );
}

function resolveCountryStrokeRgb(settings: MapBoundaryStyleSettings): RgbColor {
  return (
    (settings.countryStrokeColorHex &&
      hexToRgb(settings.countryStrokeColorHex)) ||
    hslToRgb(settings.countryStrokeColorHue, 0.72, 0.62)
  );
}

export function resolveCountryFocusFillRgba(
  settings: MapBoundaryStyleSettings,
  blendFactor: number,
): string {
  if (!settings.countryHighlightEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const rgb = resolveCountryFillRgb(settings);
  const alpha = Math.min(
    1,
    Math.max(
      0,
      resolveBoundaryFillOpacity(settings.countryFillOpacityStep) * blendFactor,
    ),
  );
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
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
