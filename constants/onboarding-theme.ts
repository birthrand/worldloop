export const ONBOARDING_COLORS = {
  gold: "#F5B84C",
  goldDark: "#E8A838",
  textPrimary: "#FFFFFF",
  textMuted: "#E2E8F0",
  ctaText: "#0B132B",
} as const;

export const ONBOARDING_CONTENT_BOTTOM_RATIO = 0.04;

export function getOnboardingContentBottom(
  bottomInset: number,
  screenHeight: number,
) {
  return (
    bottomInset + Math.max(16, screenHeight * ONBOARDING_CONTENT_BOTTOM_RATIO)
  );
}

/** 8px-grid spacing for onboarding layout. */
export const ONBOARDING_SPACING = {
  screenHorizontal: 24,
  brandTop: 16,
  headlineToDivider: 14,
  dividerToSubheadline: 16,
  copyToCta: 36,
  ctaToLogin: 16,
  contentMaxWidth: 320,
} as const;

/** Type scale — clear hierarchy: brand < secondary < body < headline. */
export const ONBOARDING_TYPOGRAPHY = {
  brand: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  headlinePrimary: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  headlinePrimaryCompact: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  headlineAccent: {
    fontFamily: "Poppins-Bold",
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  headlineAccentCompact: {
    fontFamily: "Poppins-Bold",
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 22,
  },
  cta: {
    fontSize: 16,
    lineHeight: 24,
  },
  secondary: {
    fontSize: 13,
    lineHeight: 18,
  },
} as const;

/** Primary button — 52px meets 44pt minimum touch target with label padding. */
export const ONBOARDING_CTA_HEIGHT = 52;

export const ONBOARDING_OVERLAY_GRADIENT = {
  colors: [
    "rgba(0, 0, 0, 0)",
    "rgba(0, 0, 0, 0.06)",
    "rgba(0, 0, 0, 0.28)",
    "rgba(0, 0, 0, 0.45)",
  ],
  locations: [0, 0.4, 0.68, 1],
} as const;

/** Bottom-weighted scrim — keeps the video bright up top, readable text below. */
export const ONBOARDING_BOTTOM_FADE_GRADIENT = {
  colors: [
    "rgba(0, 0, 0, 0)",
    "rgba(0, 0, 0, 0.22)",
    "rgba(0, 0, 0, 0.68)",
    "rgba(0, 0, 0, 0.94)",
  ],
  locations: [0, 0.32, 0.62, 1],
} as const;
