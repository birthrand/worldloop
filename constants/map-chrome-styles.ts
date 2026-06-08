/** Shared surfaces for map overlay controls (search, chips, pills). */
export const MAP_CHROME_SURFACE = "rgba(16, 24, 40, 0.5)";
export const MAP_CHROME_BORDER = "rgba(255, 255, 255, 0.16)";
export const MAP_CHROME_TEXT = "#f1f5f9";
export const MAP_CHROME_TEXT_MUTED = "#cbd5e1";
export const MAP_CHROME_PLACEHOLDER = "rgba(148, 163, 184, 0.72)";
export const MAP_CHROME_ACCENT = "#fbbf24";

/** Map expandable search chrome — shared with results panel positioning. */
export const MAP_SEARCH_BAR_HEIGHT = 42;
/** Full search row height including the external dismiss control. */
export const MAP_SEARCH_ROW_HEIGHT = 44;
/** Space between header row and the search bar. */
export const MAP_SEARCH_TOP_GAP = 8;
/** Space between search bar bottom and results panel top. */
export const MAP_SEARCH_PANEL_GAP = 4;
/** Blur strength for the map search frosted overlay. */
export const MAP_SEARCH_BLUR_INTENSITY = 64;
/** Dim tint over the full-screen blur — map stays visible underneath. */
export const MAP_SEARCH_OVERLAY_SCRIM = "rgba(3, 6, 16, 0.28)";
/** Extra tint on the results panel for readable text over blurred map. */
export const MAP_SEARCH_OVERLAY_PANEL = "rgba(5, 10, 24, 0.42)";

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
