/** Shared surfaces for map overlay controls (search, chips, pills). */
export const MAP_CHROME_SURFACE = "rgba(16, 24, 40, 0.5)";
export const MAP_CHROME_BORDER = "rgba(255, 255, 255, 0.16)";
export const MAP_CHROME_TEXT = "#f1f5f9";
export const MAP_CHROME_TEXT_MUTED = "#cbd5e1";
export const MAP_CHROME_PLACEHOLDER = "rgba(148, 163, 184, 0.72)";
export const MAP_CHROME_ACCENT = "#fbbf24";

export const MAP_CHIP_BASE = {
  borderWidth: 0,
  backgroundColor: MAP_CHROME_SURFACE,
} as const;

export const MAP_CHIP_SELECTED = {
  borderWidth: 1,
  borderColor: MAP_CHROME_ACCENT,
  backgroundColor: MAP_CHROME_SURFACE,
} as const;

/** Map tool stack (zoom, mode toggle) — matches layers FAB surface. */
export const MAP_CONTROL_STACK = {
  backgroundColor: MAP_CHROME_SURFACE,
  borderColor: MAP_CHROME_BORDER,
  pressedBackgroundColor: "rgba(255, 255, 255, 0.08)",
} as const;

/** Circular FABs — accent (primary random) vs control (subtle layers). */
export const MAP_CIRCULAR_FAB = {
  accentSize: 52,
  accentBorderRadius: 26,
  accentIconSize: 23,
  accentBackgroundColor: MAP_CHROME_ACCENT,
  accentBorderColor: MAP_CHROME_ACCENT,
  accentIconColor: "#0b132b",
  accentPressedBackground: "#e5ad1f",
  controlSize: 44,
  controlBorderRadius: 22,
  controlIconSize: 20,
  controlBackgroundColor: "rgba(16, 24, 40, 0.5)",
  controlBorderColor: MAP_CHROME_BORDER,
  controlIconColor: "#ffffff",
  controlPressedBackgroundColor: "rgba(255, 255, 255, 0.08)",
} as const;
