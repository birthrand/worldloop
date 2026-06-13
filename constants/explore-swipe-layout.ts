/** Swipe-card explore — SOMI-style flat black screen (dark mode). */

export const EXPLORE_SWIPE_SCREEN_BG = "#000000";
/** Card info strip — elevated charcoal footer on black screen. */
export const EXPLORE_SWIPE_CARD_SURFACE = "#1E1E1E";

export const EXPLORE_SWIPE_CARD_RADIUS = 24;
export const EXPLORE_SWIPE_CARD_IMAGE_FALLBACK = EXPLORE_SWIPE_SCREEN_BG;
export const EXPLORE_SWIPE_CARD_INFO_BG = EXPLORE_SWIPE_CARD_SURFACE;
export const EXPLORE_SWIPE_CARD_INFO_BORDER = "rgba(255, 255, 255, 0.06)";
export const EXPLORE_SWIPE_CARD_INFO_WEB_FALLBACK = EXPLORE_SWIPE_CARD_SURFACE;

/** Soft drop shadow so the card floats off the glow. */
export const EXPLORE_SWIPE_CARD_BORDER = "rgba(255, 255, 255, 0.08)";
export const EXPLORE_SWIPE_CARD_SHADOW = "#000000";
export const EXPLORE_SWIPE_CARD_SHADOW_OPACITY = 0.35;
export const EXPLORE_SWIPE_CARD_SHADOW_OFFSET_Y = 8;
export const EXPLORE_SWIPE_CARD_SHADOW_RADIUS = 16;
export const EXPLORE_SWIPE_CARD_ELEVATION = 8;

/** Blurred hero halo behind the active card — pulls color from the photo. */
export const EXPLORE_SWIPE_CARD_GLOW_SIZE_RATIO = 1.1;
export const EXPLORE_SWIPE_CARD_GLOW_BLUR = 80;
export const EXPLORE_SWIPE_CARD_GLOW_SCRIM = "rgba(0, 0, 0, 0.58)";

/**
 * Explore typography scale (px).
 * 11 nav · 12 segments · 14 body · 16 emphasis · 18 headers · 20 hero
 */
export const EXPLORE_SWIPE_TEXT_NAV = 11;
export const EXPLORE_SWIPE_TEXT_SEGMENT = 12;
export const EXPLORE_SWIPE_TEXT_BODY = 14;
export const EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT = 20;
export const EXPLORE_SWIPE_TEXT_EMPHASIS = 16;
export const EXPLORE_SWIPE_TEXT_HEADER = 18;
export const EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT = 24;
/** Centered WorldLoop wordmark in the swipe explore header. */
export const EXPLORE_SWIPE_HEADER_TITLE_SIZE = 18;
export const EXPLORE_SWIPE_TEXT_HERO = 20;
export const EXPLORE_SWIPE_TEXT_SEGMENT_LETTER_SPACING = 1.4;

export const EXPLORE_SWIPE_CARD_TITLE_COLOR = "#FFFFFF";
export const EXPLORE_SWIPE_CARD_SUBTITLE_COLOR = "#8E8E93";
export const EXPLORE_SWIPE_ACCENT_COLOR = "#fbbf24";
export const EXPLORE_SWIPE_CARD_ICON_COLOR = "rgba(255, 255, 255, 0.85)";
export const EXPLORE_SWIPE_CARD_ICON_ACTIVE_COLOR = "#FFFFFF";

/** Thin circular ring around header + card action icons (SOMI-style). */
export const EXPLORE_SWIPE_ICON_RING_BORDER = "rgba(255, 255, 255, 0.32)";
export const EXPLORE_SWIPE_ICON_RING_BG = "transparent";

/** Normalized Explore chrome — 40×40 icon boxes, tiered icon glyphs. */
export const EXPLORE_SWIPE_TOUCH_TARGET = 40;
export const EXPLORE_SWIPE_HEADER_ICON_SIZE = 24;
/** Matches bottom tab bar glyph size (24). */
export const EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE =
  EXPLORE_SWIPE_HEADER_ICON_SIZE;
/** Footer map/culture actions — slightly softer than header chrome. */
export const EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR = "rgba(255, 255, 255, 0.72)";
export const EXPLORE_SWIPE_HEADER_BUTTON_SIZE = EXPLORE_SWIPE_TOUCH_TARGET;
export const EXPLORE_SWIPE_HEADER_BUTTON_BG = EXPLORE_SWIPE_ICON_RING_BG;
export const EXPLORE_SWIPE_HEADER_BUTTON_BG_ACTIVE = EXPLORE_SWIPE_ICON_RING_BG;
export const EXPLORE_SWIPE_HEADER_BUTTON_BORDER =
  EXPLORE_SWIPE_ICON_RING_BORDER;
export const EXPLORE_SWIPE_HEADER_TITLE_COLOR = "#FFFFFF";
export const EXPLORE_SWIPE_HEADER_ICON_COLOR = "rgba(255, 255, 255, 0.85)";
export const EXPLORE_SWIPE_HEADER_ICON_COLOR_ACTIVE = "#FFFFFF";

export const EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING = 16;
/** Equal gap below header tabs and above the bottom tab bar (SOMI reference). */
export const EXPLORE_SWIPE_DECK_VERTICAL_GAP = 16;

export const EXPLORE_SWIPE_STACK_DEPTH = 1;

export const EXPLORE_SWIPE_DISMISS_THRESHOLD = 0.22;
export const EXPLORE_SWIPE_MAX_ROTATION = 10;

export const EXPLORE_SWIPE_BADGE_BG = "#E53935";

export const EXPLORE_SWIPE_ACTION_BUTTON_SIZE = EXPLORE_SWIPE_TOUCH_TARGET;
/** Hero bookmark — large corner affordance peeking above the image. */
export const EXPLORE_SWIPE_CARD_BOOKMARK_ICON_SIZE = 34;
export const EXPLORE_SWIPE_CARD_BOOKMARK_BUTTON_SIZE = 52;
export const EXPLORE_SWIPE_CARD_BOOKMARK_PEEK_OFFSET = 18;
export const EXPLORE_SWIPE_CARD_BOOKMARK_RIGHT = 8;
/** Paired header icons (search/more) — no gap between touch targets. */
export const EXPLORE_SWIPE_CARD_ACTION_GAP = 0;
/** Footer culture/map/save row on the swipe card. */
export const EXPLORE_SWIPE_CARD_FOOTER_ACTION_GAP = 6;
export const EXPLORE_SWIPE_ACTION_BUTTON_BG = EXPLORE_SWIPE_ICON_RING_BG;
export const EXPLORE_SWIPE_ACTION_BUTTON_BORDER =
  EXPLORE_SWIPE_ICON_RING_BORDER;
export const EXPLORE_SWIPE_ACTION_BUTTON_BG_ACTIVE = EXPLORE_SWIPE_ICON_RING_BG;

/** Country title — wraps to 2 lines only when needed; layout stays single-line height. */
export const EXPLORE_SWIPE_CARD_TITLE_MAX_LINES = 2;
export const EXPLORE_SWIPE_CARD_INFO_TEXT_GAP = 2;
export const EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MIN_HEIGHT =
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT +
  EXPLORE_SWIPE_CARD_INFO_TEXT_GAP +
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT;
export const EXPLORE_SWIPE_CARD_INFO_MIN_HEIGHT =
  EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MIN_HEIGHT + 28;
/** Fun fact — Poppins-Regular 14px, line-height 20px, white ~82%. */
export const EXPLORE_SWIPE_CARD_FACT_FONT_FAMILY = "Poppins-Regular";
export const EXPLORE_SWIPE_CARD_FACT_FONT_SIZE = EXPLORE_SWIPE_TEXT_BODY;
export const EXPLORE_SWIPE_CARD_FACT_MAX_LINES = 3;
export const EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT =
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT;
export const EXPLORE_SWIPE_CARD_FACT_MIN_HEIGHT =
  EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT * EXPLORE_SWIPE_CARD_FACT_MAX_LINES;
export const EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR = "rgba(255, 255, 255, 0.82)";

/** Bottom nav icon colors — white active, muted inactive. */
export const EXPLORE_SWIPE_NAV_ACTIVE_COLOR = "#FFFFFF";
export const EXPLORE_SWIPE_NAV_INACTIVE_COLOR = "rgba(255, 255, 255, 0.5)";

/** Bottom tab bar — barely lifted from the flat black screen. */
export const EXPLORE_SWIPE_TAB_BAR_BG = "#0A0A0A";
export const EXPLORE_SWIPE_TAB_BAR_BORDER = "rgba(255, 255, 255, 0.08)";

/** Subtle segmented pill — low contrast so the card stays the focus. */
export const EXPLORE_SWIPE_TAB_TRACK_BG = "rgba(255, 255, 255, 0.06)";
export const EXPLORE_SWIPE_TAB_TRACK_BORDER = "rgba(255, 255, 255, 0.05)";
export const EXPLORE_SWIPE_TAB_ACTIVE_BG = "rgba(255, 255, 255, 0.1)";
export const EXPLORE_SWIPE_TAB_ACTIVE_TEXT = "rgba(255, 255, 255, 0.92)";
export const EXPLORE_SWIPE_TAB_INACTIVE_TEXT = "rgba(255, 255, 255, 0.38)";

/** Segmented hero progress bar at top of swipe card. */
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_ACTIVE = "#FFFFFF";
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_INACTIVE =
  "rgba(255, 255, 255, 0.28)";
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_HEIGHT = 3;
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_GAP = 5;
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_WIDTH = 88;
export const EXPLORE_SWIPE_TAB_HEIGHT = 44;
export const EXPLORE_SWIPE_TAB_RADIUS = 999;
