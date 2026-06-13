import { EXPLORE_SWIPE_CARD_INFO_BG } from "@/constants/explore-swipe-layout";

/**
 * Country detail layout — prefer screen-percentage ratios over fixed pixels
 * so hero and chrome scale across device sizes.
 *
 * MVP hero target: 30–40% on feed cards; country detail uses a taller
 * immersive hero so photography reads before the details handoff.
 */
export const COUNTRY_DETAIL_HERO_HEIGHT_RATIO = 0.5;

/** Top fade on the hero — share of hero height (status bar / back button legibility). */
export const COUNTRY_DETAIL_HERO_TOP_SCRIM_RATIO = 0.45;

/** Bottom fade on the hero — share of hero height (image → content handoff). */
export const COUNTRY_DETAIL_HERO_BOTTOM_SCRIM_RATIO = 0.48;

/** Carousel dots inset from the bottom of the hero. */
export const COUNTRY_DETAIL_HERO_DOTS_BOTTOM_RATIO = 0.13;

/** Pull the details card up over the hero — share of hero height. */
export const COUNTRY_DETAIL_CONTENT_OVERLAP_HERO_RATIO = 0.11;

/** Breathing room below the hero seam — share of hero height. */
export const COUNTRY_DETAIL_CONTENT_PADDING_TOP_HERO_RATIO = 0.05;

/** Vertical rhythm inside the details block — share of screen height. */
export const COUNTRY_DETAIL_CONTENT_GAP_SCREEN_RATIO = 0.022;

/** Bottom inset of the details block — share of screen height. */
export const COUNTRY_DETAIL_CONTENT_PADDING_BOTTOM_SCREEN_RATIO = 0.028;

/** Tighten space between stats and lower sections — share of hero height. */
export const COUNTRY_DETAIL_PROFILE_SECTIONS_OFFSET_HERO_RATIO = -0.035;

/** Lighter charcoal surface for nested modules on the black detail screen. */
export const COUNTRY_DETAIL_MODULE_BG = EXPLORE_SWIPE_CARD_INFO_BG;

/** Pixels over which the title cross-fades between content and sticky header. */
export const COUNTRY_DETAIL_TITLE_CROSSFADE_RANGE = 48;

/** Height of the sticky header row (back + title). */
export const COUNTRY_DETAIL_STICKY_HEADER_ROW_HEIGHT = 44;

/** Extra top padding on the sticky header bar. */
export const COUNTRY_DETAIL_STICKY_HEADER_PADDING_TOP = 8;

export function getCountryDetailHeroHeight(screenHeight: number): number {
  return Math.round(screenHeight * COUNTRY_DETAIL_HERO_HEIGHT_RATIO);
}

export function getCountryDetailHeroTopScrimHeight(
  screenHeight: number,
): number {
  return Math.round(
    getCountryDetailHeroHeight(screenHeight) *
      COUNTRY_DETAIL_HERO_TOP_SCRIM_RATIO,
  );
}

export function getCountryDetailHeroDotsBottom(screenHeight: number): number {
  return Math.round(
    getCountryDetailHeroHeight(screenHeight) *
      COUNTRY_DETAIL_HERO_DOTS_BOTTOM_RATIO,
  );
}

export function getCountryDetailContentOverlap(screenHeight: number): number {
  return Math.round(
    getCountryDetailHeroHeight(screenHeight) *
      COUNTRY_DETAIL_CONTENT_OVERLAP_HERO_RATIO,
  );
}

export function getCountryDetailContentPaddingTop(
  screenHeight: number,
): number {
  return Math.round(
    getCountryDetailHeroHeight(screenHeight) *
      COUNTRY_DETAIL_CONTENT_PADDING_TOP_HERO_RATIO,
  );
}

export function getCountryDetailContentGap(screenHeight: number): number {
  return Math.round(screenHeight * COUNTRY_DETAIL_CONTENT_GAP_SCREEN_RATIO);
}

export function getCountryDetailContentPaddingBottom(
  screenHeight: number,
): number {
  return Math.round(
    screenHeight * COUNTRY_DETAIL_CONTENT_PADDING_BOTTOM_SCREEN_RATIO,
  );
}

export function getCountryDetailProfileSectionsOffset(
  screenHeight: number,
): number {
  return Math.round(
    getCountryDetailHeroHeight(screenHeight) *
      COUNTRY_DETAIL_PROFILE_SECTIONS_OFFSET_HERO_RATIO,
  );
}

/** Scroll offset where the country name transfers from content to the sticky header. */
export function getCountryDetailTitleCollapseThreshold(
  screenHeight: number,
  safeAreaTop: number,
): number {
  const heroHeight = getCountryDetailHeroHeight(screenHeight);
  const contentTitleTop =
    heroHeight -
    getCountryDetailContentOverlap(screenHeight) +
    getCountryDetailContentPaddingTop(screenHeight);
  const stickyHeaderBottom =
    safeAreaTop +
    COUNTRY_DETAIL_STICKY_HEADER_PADDING_TOP +
    COUNTRY_DETAIL_STICKY_HEADER_ROW_HEIGHT;

  return Math.max(0, contentTitleTop - stickyHeaderBottom);
}
