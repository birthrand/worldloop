import { hexToRgb, hslToRgb } from "@/lib/color-utils";

export type MapZoomTier = "world" | "region" | "country";
export type MapFillColorMode = "hue" | "grayscale";

export type MapBoundaryStyleSettings = {
  strokeColorEnabled: boolean;
  strokeColorHue: number;
  /** Optional exact hex override (allows grayscale like #000000 / #FFFFFF). */
  strokeColorHex: string | null;
  strokeWidthEnabled: boolean;
  strokeThicknessStep: number;
  /** 1–5 stepped line opacity (see strokeOpacityStepToDisplayPercent). */
  strokeOpacityStep: number;
  fillEnabled: boolean;
  fillOpacityStep: number;
  fillColorMode: MapFillColorMode;
  /** 0 = black, 100 = white (used when fillColorMode is grayscale). */
  fillGrayLevel: number;
  fillColorHue: number;
  /** Optional exact hex override (allows grayscale like #000000 / #FFFFFF). */
  fillColorHex: string | null;
};

/** Amber gold default (#fbbf24 ≈ hue 43). */
export const DEFAULT_STROKE_COLOR_HUE = 43;
export const DEFAULT_FILL_COLOR_HUE = 210;

export const BOUNDARY_STEP_MIN = 1;
export const BOUNDARY_STEP_MAX = 5;

export const FILL_OPACITY_STEP_LABELS = [
  "Light",
  "Soft",
  "Medium",
  "Strong",
  "Bold",
] as const;

export const STROKE_OPACITY_STEP_LABELS = FILL_OPACITY_STEP_LABELS;

export const DEFAULT_MAP_BOUNDARY_STYLE: MapBoundaryStyleSettings = {
  strokeColorEnabled: true,
  strokeColorHue: DEFAULT_STROKE_COLOR_HUE,
  strokeColorHex: null,
  strokeWidthEnabled: true,
  strokeThicknessStep: 1,
  /** Soft (25%) — subtle borders that stay out of the way. */
  strokeOpacityStep: 2,
  fillEnabled: false,
  fillOpacityStep: 2,
  fillColorMode: "hue",
  fillGrayLevel: 50,
  fillColorHue: DEFAULT_FILL_COLOR_HUE,
  fillColorHex: null,
};

const STROKE_WIDTH_RANGE: Record<MapZoomTier, { min: number; max: number }> = {
  world: { min: 0.9, max: 2.6 },
  region: { min: 0.4, max: 1.2 },
  country: { min: 0.5, max: 1.2 },
};

function clampHue(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeHexOverride(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.startsWith("#") ? value : `#${value}`;
  if (!hexToRgb(normalized)) return null;
  return normalized.toUpperCase();
}

function clampGrayLevel(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MAP_BOUNDARY_STYLE.fillGrayLevel;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseGrayscaleFromHex(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  if (rgb.r !== rgb.g || rgb.g !== rgb.b) return null;
  return Math.round((rgb.r / 255) * 100);
}

export function clampBoundaryStep(value: number): number {
  const rounded = Math.round(value);
  return Math.min(BOUNDARY_STEP_MAX, Math.max(BOUNDARY_STEP_MIN, rounded));
}

export function getFillOpacityStepLabel(step: number): string {
  const index = clampBoundaryStep(step) - BOUNDARY_STEP_MIN;
  return FILL_OPACITY_STEP_LABELS[index] ?? FILL_OPACITY_STEP_LABELS[2];
}

/** UI display percentages aligned with the boundary style modal slider. */
function opacityStepToDisplayPercent(step: number): number {
  const percents = [0, 25, 50, 75, 100] as const;
  const index = clampBoundaryStep(step) - BOUNDARY_STEP_MIN;
  return percents[index] ?? percents[2];
}

export function fillOpacityStepToDisplayPercent(step: number): number {
  return opacityStepToDisplayPercent(step);
}

export function strokeOpacityStepToDisplayPercent(step: number): number {
  return opacityStepToDisplayPercent(step);
}

function displayPercentToOpacityStep(percent: number): number {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  if (value <= 12) return 1;
  if (value <= 37) return 2;
  if (value <= 62) return 3;
  if (value <= 87) return 4;
  return 5;
}

export function displayPercentToFillOpacityStep(percent: number): number {
  return displayPercentToOpacityStep(percent);
}

export function displayPercentToStrokeOpacityStep(percent: number): number {
  return displayPercentToOpacityStep(percent);
}

export function getStrokeOpacityStepLabel(step: number): string {
  const index = clampBoundaryStep(step) - BOUNDARY_STEP_MIN;
  return STROKE_OPACITY_STEP_LABELS[index] ?? STROKE_OPACITY_STEP_LABELS[2];
}

function stepToUnit(step: number): number {
  return (
    (clampBoundaryStep(step) - BOUNDARY_STEP_MIN) /
    (BOUNDARY_STEP_MAX - BOUNDARY_STEP_MIN)
  );
}

function migrateLegacyFill(
  candidate: Partial<MapBoundaryStyleSettings> & {
    fillIntensity?: "off" | "subtle" | "medium";
  },
): Pick<MapBoundaryStyleSettings, "fillEnabled" | "fillOpacityStep"> {
  if (typeof candidate.fillEnabled === "boolean") {
    return {
      fillEnabled: candidate.fillEnabled,
      fillOpacityStep: clampBoundaryStep(
        candidate.fillOpacityStep ?? DEFAULT_MAP_BOUNDARY_STYLE.fillOpacityStep,
      ),
    };
  }

  if (candidate.fillIntensity === "off") {
    return { fillEnabled: false, fillOpacityStep: 2 };
  }
  if (candidate.fillIntensity === "medium") {
    return { fillEnabled: true, fillOpacityStep: 4 };
  }
  if (candidate.fillIntensity === "subtle") {
    return { fillEnabled: true, fillOpacityStep: 2 };
  }

  return {
    fillEnabled: DEFAULT_MAP_BOUNDARY_STYLE.fillEnabled,
    fillOpacityStep: DEFAULT_MAP_BOUNDARY_STYLE.fillOpacityStep,
  };
}

function migrateLegacyThickness(
  candidate: Partial<MapBoundaryStyleSettings> & { strokeThickness?: number },
): number {
  if (typeof candidate.strokeThicknessStep === "number") {
    return clampBoundaryStep(candidate.strokeThicknessStep);
  }

  if (typeof candidate.strokeThickness === "number") {
    return clampBoundaryStep(candidate.strokeThickness * 4 + 1);
  }

  return DEFAULT_MAP_BOUNDARY_STYLE.strokeThicknessStep;
}

export function normalizeBoundaryStyle(
  value: unknown,
): MapBoundaryStyleSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_MAP_BOUNDARY_STYLE;
  }

  const candidate = value as Partial<MapBoundaryStyleSettings> & {
    fillIntensity?: "off" | "subtle" | "medium";
    strokeThickness?: number;
  };

  if (
    !("strokeColorHue" in candidate) &&
    !("strokeColorEnabled" in candidate)
  ) {
    return DEFAULT_MAP_BOUNDARY_STYLE;
  }

  const fill = migrateLegacyFill(candidate);
  const strokeColorEnabled =
    candidate.strokeColorEnabled ??
    DEFAULT_MAP_BOUNDARY_STYLE.strokeColorEnabled;

  const normalizedFillHex = normalizeHexOverride(candidate.fillColorHex);
  const grayscaleFromHex = normalizedFillHex
    ? parseGrayscaleFromHex(normalizedFillHex)
    : null;
  const fillColorMode: MapFillColorMode =
    candidate.fillColorMode === "grayscale" || candidate.fillColorMode === "hue"
      ? candidate.fillColorMode
      : grayscaleFromHex !== null
        ? "grayscale"
        : "hue";

  return {
    strokeColorEnabled,
    strokeColorHue: clampHue(
      candidate.strokeColorHue ?? DEFAULT_MAP_BOUNDARY_STYLE.strokeColorHue,
    ),
    strokeColorHex: normalizeHexOverride(candidate.strokeColorHex),
    strokeWidthEnabled: strokeColorEnabled
      ? (candidate.strokeWidthEnabled ??
        DEFAULT_MAP_BOUNDARY_STYLE.strokeWidthEnabled)
      : false,
    strokeThicknessStep: migrateLegacyThickness(candidate),
    strokeOpacityStep: clampBoundaryStep(
      candidate.strokeOpacityStep ??
        DEFAULT_MAP_BOUNDARY_STYLE.strokeOpacityStep,
    ),
    fillEnabled: fill.fillEnabled,
    fillOpacityStep: fill.fillOpacityStep,
    fillColorMode,
    fillGrayLevel:
      fillColorMode === "grayscale"
        ? (grayscaleFromHex ?? clampGrayLevel(candidate.fillGrayLevel))
        : clampGrayLevel(candidate.fillGrayLevel),
    fillColorHue: clampHue(
      candidate.fillColorHue ?? DEFAULT_MAP_BOUNDARY_STYLE.fillColorHue,
    ),
    fillColorHex: normalizedFillHex,
  };
}

export function resolveBoundaryStrokeOpacity(step: number): number {
  return stepToUnit(step);
}

export function resolveBoundaryStrokeColor(
  settings: MapBoundaryStyleSettings,
  _zoomTier: MapZoomTier,
): string {
  if (!settings.strokeColorEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const rgb =
    (settings.strokeColorHex && hexToRgb(settings.strokeColorHex)) ||
    hslToRgb(settings.strokeColorHue, 0.55, 0.62);
  const baseOpacity = resolveBoundaryStrokeOpacity(settings.strokeOpacityStep);
  const tierMultiplier =
    _zoomTier === "country" ? 1 : _zoomTier === "region" ? 0.88 : 0.75;
  const opacity = baseOpacity * tierMultiplier;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

export function resolveBoundaryStrokeWidth(
  settings: MapBoundaryStyleSettings,
  zoomTier: MapZoomTier,
): number {
  if (!settings.strokeColorEnabled || !settings.strokeWidthEnabled) {
    return 0;
  }

  const { min, max } = STROKE_WIDTH_RANGE[zoomTier];
  const t = stepToUnit(settings.strokeThicknessStep);
  return min + (max - min) * t;
}

export function resolveBoundaryFillOpacity(step: number): number {
  // UX shows 0-100%, but rendered map fill is intentionally capped at 80%.
  const unit = stepToUnit(step);
  return unit * 0.8;
}

export function resolveBoundaryFillColor(
  settings: MapBoundaryStyleSettings,
): string {
  if (!settings.fillEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const isGrayscale = settings.fillColorMode === "grayscale";
  const grayLevel = clampGrayLevel(settings.fillGrayLevel);
  const rgb = isGrayscale
    ? (() => {
        const g = Math.round((grayLevel / 100) * 255);
        return { r: g, g, b: g };
      })()
    : (settings.fillColorHex && hexToRgb(settings.fillColorHex)) ||
      hslToRgb(settings.fillColorHue, 0.85, 0.58);
  const baseOpacity = resolveBoundaryFillOpacity(settings.fillOpacityStep);
  const opacity = isGrayscale
    ? Math.min(1, baseOpacity * (1 + ((100 - grayLevel) / 100) * 0.5))
    : baseOpacity;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/** Clamp steps and align width toggle before persisting or live-previewing. */
export function applyBoundaryStyleDraft(
  draft: MapBoundaryStyleSettings,
): MapBoundaryStyleSettings {
  return normalizeBoundaryStyle({
    ...draft,
    strokeThicknessStep: clampBoundaryStep(draft.strokeThicknessStep),
    strokeOpacityStep: clampBoundaryStep(draft.strokeOpacityStep),
    fillOpacityStep: clampBoundaryStep(draft.fillOpacityStep),
    strokeWidthEnabled: draft.strokeColorEnabled,
  });
}

export function boundaryStyleHasChanges(
  draft: MapBoundaryStyleSettings,
  current: MapBoundaryStyleSettings,
): boolean {
  return (
    draft.strokeColorEnabled !== current.strokeColorEnabled ||
    draft.strokeColorHue !== current.strokeColorHue ||
    draft.strokeColorHex !== current.strokeColorHex ||
    draft.strokeWidthEnabled !== current.strokeWidthEnabled ||
    draft.strokeThicknessStep !== current.strokeThicknessStep ||
    draft.strokeOpacityStep !== current.strokeOpacityStep ||
    draft.fillEnabled !== current.fillEnabled ||
    draft.fillOpacityStep !== current.fillOpacityStep ||
    draft.fillColorMode !== current.fillColorMode ||
    draft.fillGrayLevel !== current.fillGrayLevel ||
    draft.fillColorHue !== current.fillColorHue ||
    draft.fillColorHex !== current.fillColorHex
  );
}

export function boundaryStyleRenderKey(
  settings: MapBoundaryStyleSettings,
  zoomTier: MapZoomTier,
): string {
  return [
    resolveBoundaryStrokeColor(settings, zoomTier),
    resolveBoundaryStrokeWidth(settings, zoomTier),
    resolveBoundaryFillColor(settings),
  ].join("|");
}
