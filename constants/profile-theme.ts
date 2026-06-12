/** Profile-specific chrome — soft white on explore feed body tone. */
import { EXPLORE_FEED_CARD_SURFACE } from "@/constants/explore-feed-layout";

/** Profile screens — matches explore country info card surface. */
export const PROFILE_SCREEN_BG = EXPLORE_FEED_CARD_SURFACE;
/** Lifted rows/cards on the profile body tone. */
export const PROFILE_CARD_BG = "rgba(255, 255, 255, 0.06)";
/** Hero scrim + fade tints derived from the profile body tone (rgb 7, 14, 31). */
export const PROFILE_HERO_SCRIM = "rgba(7, 14, 31, 0.38)";
export const PROFILE_HERO_BOTTOM_FADE =
  "linear-gradient(to bottom, rgba(7, 14, 31, 0) 0%, rgba(7, 14, 31, 0.35) 55%, rgba(7, 14, 31, 0.92) 88%, #070e1f 100%)";

export const PROFILE_ICON = "rgba(255, 255, 255, 0.82)";
export const PROFILE_ICON_MUTED = "rgba(255, 255, 255, 0.55)";
export const PROFILE_ICON_RING = "rgba(255, 255, 255, 0.04)";
export const PROFILE_BACK_BUTTON_RING = "rgba(255, 255, 255, 0.1)";
export const PROFILE_ICON_SOFT_BG = "rgba(255, 255, 255, 0.08)";
export const PROFILE_ICON_BOX_RADIUS = 10;
export const PROFILE_SWITCH_TRACK_ON = "rgba(255, 255, 255, 0.35)";
export const PROFILE_EDIT_BADGE_BG = "#e2e8f0";
export const PROFILE_EDIT_BADGE_ICON = PROFILE_SCREEN_BG;
/** Secondary line under titles — readable on the profile body tone. */
export const PROFILE_TEXT_SUBTITLE = "rgba(255, 255, 255, 0.72)";
/** Muted helper line under profile nav row titles. */
export const PROFILE_NAV_SUBTITLE = "rgba(255, 255, 255, 0.45)";
/** Profile completion card accent — neutral soft white on profile body tone. */
export const PROFILE_COMPLETION_ACCENT = "#e2e8f0";
export const PROFILE_COMPLETION_ACCENT_MUTED = "rgba(226, 232, 240, 0.72)";
export const PROFILE_COMPLETION_ACCENT_BG = "rgba(255, 255, 255, 0.08)";
export const PROFILE_COMPLETION_ACCENT_BORDER = "rgba(255, 255, 255, 0.2)";
export const PROFILE_COMPLETION_ACCENT_SOFT_BG = "rgba(255, 255, 255, 0.05)";
export const PROFILE_COMPLETION_ACCENT_SOFT_BORDER = "rgba(255, 255, 255, 0.1)";
export const PROFILE_COMPLETION_ACCENT_ON = PROFILE_SCREEN_BG;
/** Completed steps — green checkmarks and progress segments. */
export const PROFILE_COMPLETION_DONE = "#22c55e";
export const PROFILE_COMPLETION_DONE_ON = "#ffffff";
export const PROFILE_COMPLETION_DONE_BG = "rgba(34, 197, 94, 0.15)";
export const PROFILE_COMPLETION_DONE_BORDER = "rgba(34, 197, 94, 0.35)";
export const PROFILE_COMPLETION_DONE_SOFT_BG = "rgba(34, 197, 94, 0.08)";
export const PROFILE_COMPLETION_DONE_SOFT_BORDER = "rgba(34, 197, 94, 0.2)";
/** Space below back header before hero identity (avatar). */
export const PROFILE_HEADER_BOTTOM_GAP = 12;
/** Space above avatar when stacked below the back header row. */
export const PROFILE_HERO_TOP_PADDING = 8;
/** Gap between status bar and avatar on the tab-root profile screen. */
export const PROFILE_HERO_SAFE_TOP_GAP = 10;
/** Space between display name and secondary identity lines (email, location). */
export const PROFILE_IDENTITY_PRIMARY_GAP = 6;
/** Log out control — solid destructive fill. */
export const PROFILE_LOGOUT_TEXT = "#ffffff";
export const PROFILE_LOGOUT_ICON = "#ffffff";
export const PROFILE_LOGOUT_BG = "#ef4444";
export const PROFILE_LOGOUT_PRESSED_BG = "#dc2626";
