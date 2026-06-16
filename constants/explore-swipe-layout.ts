/** Swipe-card explore — deep neutral world background (not pure black). */

/** Base screen fill — top stop of the world gradient. */
export const EXPLORE_SWIPE_SCREEN_BG = "#06090C";
export const EXPLORE_SWIPE_WORLD_BG_TOP = "#06090C";
export const EXPLORE_SWIPE_WORLD_BG_BOTTOM = "#0A0E14";
/** Always-on dim over base + wash — keeps the environment subdued. */
export const EXPLORE_SWIPE_WORLD_BASE_DIM = "rgba(0, 0, 0, 0.22)";
/** Heavy darken over muted hero wash — keeps gradient → wash continuous. */
export const EXPLORE_SWIPE_WORLD_WASH_SCRIM = "rgba(6, 9, 12, 0.92)";

/** Card info strip — elevated charcoal footer on world background. */
export const EXPLORE_SWIPE_CARD_SURFACE = "#141414";

export const EXPLORE_SWIPE_CARD_RADIUS = 24;
export const EXPLORE_SWIPE_CARD_IMAGE_FALLBACK = EXPLORE_SWIPE_WORLD_BG_TOP;
export const EXPLORE_SWIPE_CARD_INFO_BG = EXPLORE_SWIPE_CARD_SURFACE;
export const EXPLORE_SWIPE_CARD_INFO_BORDER = "rgba(255, 255, 255, 0.06)";
export const EXPLORE_SWIPE_CARD_INFO_WEB_FALLBACK = EXPLORE_SWIPE_CARD_SURFACE;
/** Light scrim shown while a swipe-card tap target is pressed. */
export const EXPLORE_SWIPE_CARD_PRESS_OVERLAY = "rgba(255, 255, 255, 0.08)";

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
 * 11 nav · 14 body · 16 emphasis · 18 headers · 20 hero
 */
export const EXPLORE_SWIPE_TEXT_NAV = 11;
export const EXPLORE_SWIPE_TEXT_BODY = 14;
export const EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT = 20;
export const EXPLORE_SWIPE_TEXT_EMPHASIS = 16;
export const EXPLORE_SWIPE_TEXT_HEADER = 18;
export const EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT = 24;
/** Centered WorldLoop wordmark in the swipe explore header. */
export const EXPLORE_SWIPE_HEADER_TITLE_SIZE = 18;
export const EXPLORE_SWIPE_TEXT_HERO = 20;

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

/** Screen gutter — header + swipe deck inset from device edges. */
export const EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING = 16;
/** Card footer text + actions inset inside the swipe card. */
export const EXPLORE_SWIPE_CARD_HORIZONTAL_PADDING = 16;
/** Equal gap below header tabs and above the bottom tab bar (SOMI reference). */
export const EXPLORE_SWIPE_DECK_VERTICAL_GAP = 16;

export const EXPLORE_SWIPE_STACK_DEPTH = 1;
export const EXPLORE_SWIPE_STACK_SCALE_STEP = 0.03;
export const EXPLORE_SWIPE_STACK_OFFSET_X = 6;
export const EXPLORE_SWIPE_STACK_OFFSET_Y = 8;

/** Ghost transition wash — muted hero bleed on top of base gradient. */
export const EXPLORE_SWIPE_GHOST_BLUR = 72;
export const EXPLORE_SWIPE_GHOST_PALETTE_OPACITY = 0.16;
export const EXPLORE_SWIPE_GHOST_BLUR_INTENSITY = 32;

export const EXPLORE_SWIPE_DISMISS_THRESHOLD = 0.25;
/** Vertical fling velocity (px/s) that dismisses even below distance threshold. */
export const EXPLORE_SWIPE_VELOCITY_THRESHOLD = 800;
/** Card tilt while dragging — Tinder-style lean into the swipe. */
export const EXPLORE_SWIPE_MAX_ROTATION = 14;
/** Minimum release distance (px) before axis intent is evaluated. */
export const EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION = 16;

/** Tinder-style swipe stamps on the active card. */
export const EXPLORE_SWIPE_STAMP_NEXT_COLOR = "#FF4458";
export const EXPLORE_SWIPE_STAMP_BACK_COLOR = EXPLORE_SWIPE_ACCENT_COLOR;
export const EXPLORE_SWIPE_STAMP_BORDER_WIDTH = 3;
export const EXPLORE_SWIPE_STAMP_FONT_SIZE = 34;
export const EXPLORE_SWIPE_STAMP_ROTATION = 12;

export const EXPLORE_SWIPE_BADGE_BG = "#E53935";

export const EXPLORE_SWIPE_ACTION_BUTTON_SIZE = EXPLORE_SWIPE_TOUCH_TARGET;
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
/** Tight gap between title and stats line (same content group). */
export const EXPLORE_SWIPE_CARD_INFO_HEADER_GAP = 2;
/** Gap between country name and bookmark in the title row. */
export const EXPLORE_SWIPE_CARD_INFO_TITLE_ACTION_GAP = 8;
/** Map hugs bookmark — overlaps touch padding without shifting bookmark. */
export const EXPLORE_SWIPE_CARD_TITLE_ACTIONS_OVERLAP = -4;
/** Section break between header block (title + stats) and fun fact. */
export const EXPLORE_SWIPE_CARD_INFO_REGION_GAP = 4;
/** @deprecated Use EXPLORE_SWIPE_CARD_INFO_HEADER_GAP — kept for saved-list parity. */
export const EXPLORE_SWIPE_CARD_INFO_TEXT_GAP =
  EXPLORE_SWIPE_CARD_INFO_HEADER_GAP;
/** Title + stats block before comparing to bookmark height. */
export const EXPLORE_SWIPE_CARD_INFO_TITLE_BLOCK_MIN_HEIGHT =
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT +
  EXPLORE_SWIPE_CARD_INFO_HEADER_GAP +
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT;
export const EXPLORE_SWIPE_CARD_INFO_TITLE_BLOCK_MAX_HEIGHT =
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT * EXPLORE_SWIPE_CARD_TITLE_MAX_LINES +
  EXPLORE_SWIPE_CARD_INFO_HEADER_GAP +
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT;
/** @deprecated Use EXPLORE_SWIPE_CARD_INFO_TITLE_BLOCK_* */
export const EXPLORE_SWIPE_CARD_INFO_TITLE_ROW_MIN_HEIGHT = Math.max(
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
);
export const EXPLORE_SWIPE_CARD_INFO_TITLE_ROW_MAX_HEIGHT = Math.max(
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT * EXPLORE_SWIPE_CARD_TITLE_MAX_LINES,
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
);
/** Header row — text block + bookmark; fixed height so hero never jumps. */
export const EXPLORE_SWIPE_CARD_INFO_HEADER_MIN_HEIGHT = Math.max(
  EXPLORE_SWIPE_CARD_INFO_TITLE_BLOCK_MIN_HEIGHT,
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
);
export const EXPLORE_SWIPE_CARD_INFO_HEADER_MAX_HEIGHT = Math.max(
  EXPLORE_SWIPE_CARD_INFO_TITLE_BLOCK_MAX_HEIGHT,
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
);
/** @deprecated Use EXPLORE_SWIPE_CARD_INFO_HEADER_* — kept for callers still importing. */
export const EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MIN_HEIGHT =
  EXPLORE_SWIPE_CARD_INFO_HEADER_MIN_HEIGHT;
export const EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MAX_HEIGHT =
  EXPLORE_SWIPE_CARD_INFO_HEADER_MAX_HEIGHT;
export const EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_TOP = 16;
export const EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_BOTTOM = 16;
/** Eyebrow above the fun fact body. */
export const EXPLORE_SWIPE_CARD_FACT_LABEL_GAP = 4;
export const EXPLORE_SWIPE_CARD_FACT_LABEL_FONT_SIZE = EXPLORE_SWIPE_TEXT_NAV;
export const EXPLORE_SWIPE_CARD_FACT_LABEL_LINE_HEIGHT = 14;
export const EXPLORE_SWIPE_CARD_FACT_LABEL_COLOR =
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR;
/** Fun fact — Poppins-Regular 14px, line-height 20px, white ~82%. */
export const EXPLORE_SWIPE_CARD_FACT_FONT_FAMILY = "Poppins-Regular";
export const EXPLORE_SWIPE_CARD_FACT_FONT_SIZE = EXPLORE_SWIPE_TEXT_BODY;
export const EXPLORE_SWIPE_CARD_FACT_MAX_LINES = 3;
export const EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT =
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT;
export const EXPLORE_SWIPE_CARD_FACT_MIN_HEIGHT =
  EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT * EXPLORE_SWIPE_CARD_FACT_MAX_LINES;
/** Reserve max fact block height in the fixed info strip (label + text use natural height). */
export const EXPLORE_SWIPE_CARD_INFO_FACT_SLOT_HEIGHT =
  EXPLORE_SWIPE_CARD_FACT_LABEL_LINE_HEIGHT +
  EXPLORE_SWIPE_CARD_FACT_LABEL_GAP +
  EXPLORE_SWIPE_CARD_FACT_MIN_HEIGHT;
export const EXPLORE_SWIPE_CARD_INFO_REGION_HEIGHT =
  EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_TOP +
  EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_BOTTOM +
  EXPLORE_SWIPE_CARD_INFO_REGION_GAP +
  EXPLORE_SWIPE_CARD_INFO_HEADER_MAX_HEIGHT +
  EXPLORE_SWIPE_CARD_INFO_FACT_SLOT_HEIGHT;
export const EXPLORE_SWIPE_CARD_INFO_MIN_HEIGHT =
  EXPLORE_SWIPE_CARD_INFO_HEADER_MIN_HEIGHT + 28;
export const EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR = "rgba(255, 255, 255, 0.82)";

/** Bottom nav icon colors — white active, muted inactive. */
export const EXPLORE_SWIPE_NAV_ACTIVE_COLOR = "#FFFFFF";
export const EXPLORE_SWIPE_NAV_INACTIVE_COLOR = "rgba(255, 255, 255, 0.5)";

/** Bottom tab bar — aligned with world background top tone. */
export const EXPLORE_SWIPE_TAB_BAR_BG = "#06090C";
export const EXPLORE_SWIPE_TAB_BAR_BORDER = "rgba(255, 255, 255, 0.08)";

/** Segmented hero progress bar at top of swipe card. */
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_ACTIVE = "#FFFFFF";
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_INACTIVE =
  "rgba(255, 255, 255, 0.28)";
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_HEIGHT = 3;
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_GAP = 5;
export const EXPLORE_SWIPE_CAROUSEL_SEGMENT_WIDTH = 88;
