/** Approximate UN member + observer states used for sanity checks. */
export const WORLD_COUNTRY_COUNT = 195;

/** Default radius (km) for `countriesNearPoint` when callers omit an explicit limit context. */
export const DEFAULT_NEAR_POINT_RADIUS_KM = 800;

/** Centroid ± degrees when Natural Earth has no polygon match (fallback only). */
export const CENTROID_FALLBACK_PADDING_DEGREES = 2;

/**
 * Zoom tier thresholds (approximate map region deltas / globe distance).
 * Used by spatial context in step 15b — defined here for shared vocabulary.
 */
export const ZOOM_TIER_THRESHOLDS = {
  /** Above this delta → world tier (continent clusters). */
  worldRegionDelta: 120,
  /** Below this delta → country tier when a country is focused. */
  countryRegionDelta: 8,
} as const;

/** Trailing debounce for committing discovery scope after map camera settles. */
export const SPATIAL_SCOPE_COMMIT_DEBOUNCE_MS = 300;
