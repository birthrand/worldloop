export const SIGN_UP_COLORS = {
  /** Fallback behind `background-main` image */
  screenBg: "#1A1A1A",
  textPrimary: "#FFFFFF",
  textMuted: "#9CA3AF",
  brandAccent: "#F5B84C",
  sheetBg: "rgba(255, 255, 255, 0.08)",
  sheetText: "#FFFFFF",
  sheetTextMuted: "#A3A3A3",
  /** Placeholder copy — subdued so entered values read clearly on dark fields */
  fieldPlaceholder: "#6E7A8A",
  sheetLabel: "#FFFFFF",
  fieldBorder: "rgba(255, 255, 255, 0.1)",
  tabTrack: "rgba(255, 255, 255, 0.1)",
  tabInactive: "#9CA3AF",
  tabActiveBg: "rgba(255, 255, 255, 0.14)",
  tabActiveText: "#FFFFFF",
  primary: "#F5B84C",
  primaryPressed: "#E8A838",
  primaryText: "#1A1A1A",
  link: "#F5B84C",
  dividerLine: "rgba(255, 255, 255, 0.12)",
  socialBg: "rgba(255, 255, 255, 0.06)",
  /** Outlined secondary control — visible edge without competing with primary CTA */
  socialBorder: "rgba(255, 255, 255, 0.14)",
  socialText: "#FFFFFF",
  google: "#EA4335",
  backButtonBorder: "rgba(255, 255, 255, 0.1)",
  patternLine: "rgba(255, 255, 255, 0.05)",
} as const;

export const SIGN_UP_SPACING = {
  screenPadding: 24,
  screenBottomInset: 32,
  /** Below safe area — pushes full auth screen content downward */
  brandTopInset: 64,
  brandToTitleGap: 20,
  subtitleTopGap: 10,
  /** Hero copy → first field */
  headerToFormGap: 32,
  subtitleMaxWidth: 280,
  /** Stacked inputs */
  fieldGap: 16,
  /** Password field → forgot-password link */
  passwordToForgotGap: 4,
  /** Last field group → primary CTA */
  fieldToCtaGap: 24,
  /** Primary CTA → secondary link (e.g. forgot password) */
  ctaToSecondaryLinkGap: 12,
  /** Primary block / divider / social / footer */
  formBlockGap: 26,
  /** Google ↔ Apple */
  socialGap: 12,
  /** Footer link tap target */
  footerTapPadding: 4,
} as const;

export const SIGN_UP_TYPOGRAPHY = {
  brand: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  tab: {
    fontSize: 15,
    lineHeight: 22,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
  },
  divider: {
    fontSize: 15,
    lineHeight: 22,
  },
  social: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    fontSize: 14,
    lineHeight: 20,
  },
} as const;

export const SIGN_UP_FIELD_HEIGHT = 52;
/** Matches login fields — softer than pill, distinct from full-radius CTAs */
export const SIGN_UP_FIELD_RADIUS = 14;
export const SIGN_UP_BUTTON_HEIGHT = 52;
export const SIGN_UP_SOCIAL_HEIGHT = 52;
export const SIGN_UP_TAB_HEIGHT = 44;
export const SIGN_UP_TAB_TRACK_PADDING = 4;
export const SIGN_UP_TAB_TRACK_HEIGHT =
  SIGN_UP_TAB_HEIGHT + SIGN_UP_TAB_TRACK_PADDING * 2;
