import {
  COUNTRY_FOCUS_LATITUDE_DELTA,
  COUNTRY_FOCUS_LATITUDE_DELTA_MAX,
  COUNTRY_FOCUS_LATITUDE_DELTA_MIN,
} from "@/constants/map-focus-tiers";

import type { MapCountry } from "@/types/country";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Tier 1 country-focus latitudeDelta — scales by land area so large countries
 * (Canada) frame tighter and small ones (Vatican) get more surrounding context.
 */
export function resolveCountryFocusLatitudeDelta(
  country: Pick<MapCountry, "area"> | MapCountry,
): number {
  const area = country.area;
  if (!area || area <= 0) {
    return COUNTRY_FOCUS_LATITUDE_DELTA;
  }

  // log10(1) ≈ 0 (microstates) … log10(17e6) ≈ 7.2 (Russia)
  const logArea = Math.log10(Math.max(area, 1));
  const t = clamp(logArea / 7.2, 0, 1);

  return (
    COUNTRY_FOCUS_LATITUDE_DELTA_MAX -
    t * (COUNTRY_FOCUS_LATITUDE_DELTA_MAX - COUNTRY_FOCUS_LATITUDE_DELTA_MIN)
  );
}
