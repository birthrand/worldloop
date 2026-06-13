/**
 * Map focus tiers — semantic zoom levels (camera-driven, not selection-driven).
 *
 * | Tier | Name           | Intent                                      | latitudeDelta |
 * | ---- | -------------- | ------------------------------------------- | ------------- |
 * | 0    | World View     | FAB / explore entry, continent clusters     | > 60°         |
 * | 1    | Country Focus  | "Show me THIS country clearly"              | ~18–32°       |
 * | 2    | Detail View    | cities / landmarks (future)                 | ≤ 15°         |
 *
 * Continent cluster framing (multi-country context) uses `CONTINENT_CONTEXT_LATITUDE_DELTA`
 * (~42°) — wider than country focus, not a separate tier.
 *
 * Internal camera tier strings (`world` | `region` | `country`) map as:
 * - `world` → Tier 0
 * - `region` → Tier 1 Country Focus
 * - `country` → Tier 2 Detail
 */

/** Above this latitudeDelta the flat map is framed at world scale (Tier 0). */
export const FOCUS_TIER_WORLD_MIN_LATITUDE_DELTA = 60;

/** Default Tier 1 landing delta — country detail → map handoff. */
export const COUNTRY_FOCUS_LATITUDE_DELTA = 25;

/** Tier 1 adaptive range (large countries → min, small countries → max). */
export const COUNTRY_FOCUS_LATITUDE_DELTA_MIN = 18;
export const COUNTRY_FOCUS_LATITUDE_DELTA_MAX = 32;

/** Below this latitudeDelta → Tier 2 detail (all region markers, tight UI). */
export const DETAIL_ZOOM_LATITUDE_DELTA = 15;

/** Continent cluster framing — several countries visible (not single-country focus). */
export const CONTINENT_CONTEXT_LATITUDE_DELTA = 42;
