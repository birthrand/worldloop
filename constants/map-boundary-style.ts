import { hslToRgb } from "@/lib/color-utils";

type MapZoomTier = "world" | "region" | "country";

export type MapBoundaryStyleSettings = {
  strokeColorEnabled: boolean;
  strokeColorHue: number;
  strokeWidthEnabled: boolean;
  strokeThicknessStep: number;
  fillEnabled: boolean;
  fillOpacityStep: number;
  fillColorHue: number;
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

export const DEFAULT_MAP_BOUNDARY_STYLE: MapBoundaryStyleSettings = {
  strokeColorEnabled: true,
  strokeColorHue: DEFAULT_STROKE_COLOR_HUE,
  strokeWidthEnabled: true,
  strokeThicknessStep: 1,
  fillEnabled: false,
  fillOpacityStep: 2,
  fillColorHue: DEFAULT_FILL_COLOR_HUE,
};

const STROKE_OPACITY_BY_TIER: Record<MapZoomTier, number> = {
  world: 0.48,
  region: 0.38,
  country: 0.28,
};

const STROKE_WIDTH_RANGE: Record<MapZoomTier, { min: number; max: number }> = {
  world: { min: 0.9, max: 2.6 },
  region: { min: 0.7, max: 1.8 },
  country: { min: 0.5, max: 1.2 },
};

function clampHue(value: number): number {
  return ((value % 360) + 360) % 360;
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
export function fillOpacityStepToDisplayPercent(step: number): number {
  const percents = [20, 35, 50, 65, 80] as const;
  const index = clampBoundaryStep(step) - BOUNDARY_STEP_MIN;
  return percents[index] ?? percents[2];
}

export function displayPercentToFillOpacityStep(percent: number): number {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  if (value <= 27) return 1;
  if (value <= 42) return 2;
  if (value <= 57) return 3;
  if (value <= 72) return 4;
  return 5;
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

  return {
    strokeColorEnabled,
    strokeColorHue: clampHue(
      candidate.strokeColorHue ?? DEFAULT_MAP_BOUNDARY_STYLE.strokeColorHue,
    ),
    strokeWidthEnabled: strokeColorEnabled
      ? (candidate.strokeWidthEnabled ??
        DEFAULT_MAP_BOUNDARY_STYLE.strokeWidthEnabled)
      : false,
    strokeThicknessStep: migrateLegacyThickness(candidate),
    fillEnabled: fill.fillEnabled,
    fillOpacityStep: fill.fillOpacityStep,
    fillColorHue: clampHue(
      candidate.fillColorHue ?? DEFAULT_MAP_BOUNDARY_STYLE.fillColorHue,
    ),
  };
}

export function resolveBoundaryStrokeColor(
  settings: MapBoundaryStyleSettings,
  zoomTier: MapZoomTier,
): string {
  if (!settings.strokeColorEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const { r, g, b } = hslToRgb(settings.strokeColorHue, 0.85, 0.58);
  const opacity = STROKE_OPACITY_BY_TIER[zoomTier];
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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
  const clamped = clampBoundaryStep(step);
  return clamped * 0.08;
}

export function resolveBoundaryFillColor(
  settings: MapBoundaryStyleSettings,
): string {
  if (!settings.fillEnabled) {
    return "rgba(0, 0, 0, 0)";
  }

  const { r, g, b } = hslToRgb(settings.fillColorHue, 0.85, 0.58);
  const opacity = resolveBoundaryFillOpacity(settings.fillOpacityStep);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function boundaryStyleHasChanges(
  draft: MapBoundaryStyleSettings,
  current: MapBoundaryStyleSettings,
): boolean {
  return (
    draft.strokeColorEnabled !== current.strokeColorEnabled ||
    draft.strokeColorHue !== current.strokeColorHue ||
    draft.strokeWidthEnabled !== current.strokeWidthEnabled ||
    draft.strokeThicknessStep !== current.strokeThicknessStep ||
    draft.fillEnabled !== current.fillEnabled ||
    draft.fillOpacityStep !== current.fillOpacityStep ||
    draft.fillColorHue !== current.fillColorHue
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
