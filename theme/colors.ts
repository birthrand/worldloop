/**
 * WorldLoop design tokens — colors
 * @see prompt_material/design-system.png
 */
export const colors = {
  brand: {
    midnightNavy: "#0B132B",
    oceanBlue: "#1565FF",
    tealCyan: "#00D4C7",
    auroraPurple: "#7B61FF",
    cloudWhite: "#FFFFFF",
  },
  semantic: {
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  neutral: {
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    surface: "#F8FAFC",
    border: "#E2E8F0",
    background: "#F1F5F9",
  },
} as const;

export type Colors = typeof colors;
