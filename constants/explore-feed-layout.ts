import { WORLDLOOP_HEADER_TOP_PADDING } from "@/components/worldloop-header";
import { CULTURE_CHROME_TOUCH_SIZE } from "@/constants/culture-chrome";

/** Outer radius for the stacked hero + info card unit. */
export const EXPLORE_FEED_SURFACE_RADIUS = 14;

/** Extra fade below header chrome where blurred hero blends into the sharp feed. */
export const EXPLORE_HEADER_SCRIM_EXTRA = 14;

/** Bottom padding used when the explore header overlays the feed. */
export const EXPLORE_HEADER_OVERLAY_BOTTOM_PADDING = 2;

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

/**
 * Content panel below the hero — slightly lifted from tab bar (#050a18) so
 * photography hands off to UI with a touch more tonal separation.
 */
export const EXPLORE_FEED_CARD_SURFACE = "#070e1f";

/** Horizontal padding inside the country info card. */
export const EXPLORE_FEED_CARD_HORIZONTAL_PADDING = 14;

/** Inner horizontal padding for the header action rail pill. */
export const EXPLORE_FEED_RAIL_HORIZONTAL_PADDING = 4;

/** Purposeful clearance above the tab bar. */
export const EXPLORE_FEED_BOTTOM_INSET = 0;
