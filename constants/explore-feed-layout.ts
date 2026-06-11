import { WORLDLOOP_HEADER_TOP_PADDING } from "@/components/worldloop-header";
import { CULTURE_CHROME_TOUCH_SIZE } from "@/constants/culture-chrome";

/**
 * Content panel below the hero — slightly lifted from tab bar (#050a18) so
 * photography hands off to UI with a touch more tonal separation.
 */
export const EXPLORE_FEED_CARD_SURFACE = "#070e1f";

/** Explore feed body + hero chrome — matches the country info card. */
export const EXPLORE_FEED_BODY_BG = EXPLORE_FEED_CARD_SURFACE;

/** Header scrim tints — derived from the card surface. */
export const EXPLORE_FEED_CHROME_SCRIM_FALLBACK = "rgba(7, 14, 31, 0.88)";
export const EXPLORE_FEED_CHROME_BASE_TINT = "rgba(7, 14, 31, 0.28)";
export const EXPLORE_FEED_CHROME_TOP_GRADIENT =
  "linear-gradient(to bottom, rgba(7, 14, 31, 0.82) 0%, rgba(7, 14, 31, 0.62) 38%, rgba(7, 14, 31, 0.24) 68%, rgba(7, 14, 31, 0) 100%)";

export const EXPLORE_FEED_HEADER_BACKDROP_TINT = "rgba(7, 14, 31, 0.52)";
export const EXPLORE_FEED_HEADER_BACKDROP_WEB_FALLBACK = "rgba(7, 14, 31, 0.9)";
export const EXPLORE_FEED_HEADER_BACKDROP_GRADIENT =
  "linear-gradient(to bottom, rgba(7, 14, 31, 0.88) 0%, rgba(7, 14, 31, 0.68) 32%, rgba(7, 14, 31, 0.28) 58%, rgba(7, 14, 31, 0.08) 82%, rgba(7, 14, 31, 0) 100%)";

/** Outer radius for the stacked hero + info card unit. */
export const EXPLORE_FEED_SURFACE_RADIUS = 14;

/** Extra fade below header chrome where blurred hero blends into the sharp feed. */
export const EXPLORE_HEADER_SCRIM_EXTRA = 6;

/** Bottom padding used when the explore header overlays the feed. */
export const EXPLORE_HEADER_OVERLAY_BOTTOM_PADDING = 0;

/** Tighter edge inset for explore header icons vs default WorldLoop chrome (16). */
export const EXPLORE_HEADER_HORIZONTAL_PADDING = 8;

/** Pull hero imagery under the floating header to remove the visible seam. */
export const EXPLORE_HEADER_HERO_OVERLAP = 8;

/** Height of the "Here · …" subtitle row under the header. */
export const EXPLORE_HERE_SUBTITLE_HEIGHT = 14;

/** Height of the header row + safe area; sharp hero content starts below this. */
export function getExploreHeaderContentHeight(
  safeAreaTop: number,
  options?: { hereMode?: boolean },
) {
  return (
    safeAreaTop +
    WORLDLOOP_HEADER_TOP_PADDING +
    CULTURE_CHROME_TOUCH_SIZE +
    EXPLORE_HEADER_OVERLAY_BOTTOM_PADDING +
    (options?.hereMode ? EXPLORE_HERE_SUBTITLE_HEIGHT : 0)
  );
}

/** Top inset for feed hero imagery — overlaps header chrome slightly. */
export function getExploreHeroTopInset(
  safeAreaTop: number,
  options?: { hereMode?: boolean },
) {
  return Math.max(
    safeAreaTop,
    getExploreHeaderContentHeight(safeAreaTop, options) -
      EXPLORE_HEADER_HERO_OVERLAP,
  );
}

/** Full frosted header band including the blend fade into the feed. */
export function getExploreHeaderChromeHeight(
  safeAreaTop: number,
  options?: { hereMode?: boolean },
) {
  return (
    getExploreHeaderContentHeight(safeAreaTop, options) +
    EXPLORE_HEADER_SCRIM_EXTRA
  );
}

/** Horizontal padding inside the country info card. */
export const EXPLORE_FEED_CARD_HORIZONTAL_PADDING = 14;

/** Inner horizontal padding for the header action rail pill. */
export const EXPLORE_FEED_RAIL_HORIZONTAL_PADDING = 4;

/** Purposeful clearance above the tab bar. */
export const EXPLORE_FEED_BOTTOM_INSET = 0;
