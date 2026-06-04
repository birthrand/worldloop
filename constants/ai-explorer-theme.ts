/** Amber accent tokens for the AI Content Explorer screen. */
const AMBER = "#fbbf24";
const AMBER_MUTED = "rgba(251, 191, 36, 0.4)";
const AMBER_SOFT = "rgba(251, 191, 36, 0.12)";

export const AI_EXPLORER_THEME = {
  accent: AMBER,
  accentMuted: AMBER_MUTED,
  accentSoft: AMBER_SOFT,

  primary: AMBER,
  primaryMuted: AMBER_MUTED,
  primarySoft: AMBER_SOFT,

  success: AMBER,
  successMuted: AMBER_MUTED,
  successSoft: AMBER_SOFT,

  textPrimary: "#ffffff",
  textSecondary: "rgba(255, 255, 255, 0.72)",
  textMuted: "rgba(255, 255, 255, 0.55)",
  textFaint: "rgba(255, 255, 255, 0.5)",

  divider: "rgba(255, 255, 255, 0.12)",
  borderStrong: "rgba(255, 255, 255, 0.22)",

  /** Opaque panel behind profile content (covers hero overlap). */
  surface: "#0f172a",
} as const;

export const DIVIDER_COLOR = AI_EXPLORER_THEME.divider;
