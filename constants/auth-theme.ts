export const AUTH_COLORS = {
  /** Primary CTA fill — pair with dark `ctaText` */
  gold: "#F5B84C",
  /** Icons and links on the white sheet — darker for readable contrast */
  goldOnLight: "#B8730A",
  goldDark: "#E8A838",
  textPrimary: "#FFFFFF",
  textMuted: "#9CA3AF",
  textSubtle: "#CBD5E1",
  ctaText: "#1A1A1A",
  headerBg: "transparent",
  /** Login sheet — solid top avoids warm photo bleed on rounded corners */
  sheetBgTop: "#1A1A1A",
  sheetBg: "rgba(22, 22, 22, 0.9)",
  fieldBg: "rgba(255, 255, 255, 0.08)",
  sheetText: "#FFFFFF",
  sheetTextMuted: "#A3A3A3",
  sheetLabel: "#9CA3AF",
  cardBg: "rgba(15, 23, 42, 0.72)",
  cardBgNeutral: "rgba(0, 0, 0, 0.85)",
  cardBorder: "rgba(255, 255, 255, 0.8)",
  accentBorderMuted: "rgba(245, 184, 76, 0.28)",
  inputBg: "rgba(255, 255, 255, 0.06)",
  inputBorder: "rgba(255, 255, 255, 0.12)",
  inputPlaceholder: "#64748B",
  fieldBorder: "rgba(255, 255, 255, 0)",
  fieldLabel: "#9CA3AF",
  tabTrack: "rgba(255, 255, 255, 0.1)",
  tabInactive: "#9CA3AF",
  tabActiveBg: "rgba(255, 255, 255, 0.14)",
  tabActiveText: "#FFFFFF",
  dividerLine: "rgba(255, 255, 255, 0.14)",
  socialBg: "rgba(255, 255, 255, 0.06)",
  /** Outlined secondary control — matches register social buttons */
  socialBorder: "rgba(255, 255, 255, 0.14)",
  socialText: "#FFFFFF",
  google: "#EA4335",
  facebook: "#1877F2",
  backButtonBorder: "rgba(255, 255, 255, 0.1)",
  overlay: "rgba(11, 19, 43, 0.35)",
  /** Uniform scrim over blurred `background-main` for readable header text */
  backgroundScrim: "rgba(0, 0, 0, 0.5)",
} as const;

export const AUTH_BACKGROUND_BLUR_INTENSITY = 40;
export const AUTH_BACKGROUND_WEB_BLUR_FALLBACK = "rgba(0, 0, 0, 0.55)";

export const AUTH_BACKGROUND_GRADIENT = {
  colors: ["rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.62)", "rgba(0, 0, 0, 0.82)"],
  locations: [0, 0.45, 1] as const,
} as const;

/** Extra vignette for full-screen auth (sign-in / sign-up) — keeps lower form legible */
export const AUTH_SIGN_UP_BOTTOM_GRADIENT = {
  colors: ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.35)", "rgba(0, 0, 0, 0.55)"],
  locations: [0, 0.55, 1] as const,
} as const;

export const AUTH_GLOBE_ACCENT_FILTERS = [
  { keypath: "**", color: AUTH_COLORS.gold },
] as const;

export const AUTH_SPACING = {
  screenHorizontal: 24,
  sheetRadius: 32,
  sheetOverlap: 48,
  headerBackdropHeight: "62%",
  sheetPadding: 24,
  cardPadding: 24,
  fieldGap: 16,
  fieldToCtaGap: 22,
  ctaToDividerGap: 18,
  dividerToSocialGap: 14,
  sectionGap: 24,
  mascotSize: 72,
  mascotOverlap: 36,
  globeSize: 52,
  globeSizeLogin: 70,
} as const;

export const AUTH_TYPOGRAPHY = {
  brand: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  tab: {
    fontSize: 15,
    lineHeight: 22,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  fieldValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  social: {
    fontSize: 14,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    fontSize: 13,
    lineHeight: 18,
  },
} as const;

export const AUTH_CTA_HEIGHT = 52;
export const AUTH_TAB_HEIGHT = 44;
export const AUTH_TAB_TRACK_PADDING = 4;
export const AUTH_TAB_TRACK_HEIGHT =
  AUTH_TAB_HEIGHT + AUTH_TAB_TRACK_PADDING * 2;
export const AUTH_INPUT_HEIGHT = 52;
export const AUTH_FIELD_HEIGHT = 64;
export const AUTH_SOCIAL_HEIGHT = 48;
export const AUTH_CARD_RADIUS = 28;
export const AUTH_INPUT_RADIUS = 16;
/** ~25% of input height — rounded fields without pill shape (CTAs stay pill) */
export const AUTH_FIELD_RADIUS = 14;
