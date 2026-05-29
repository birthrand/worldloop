import { normalizeCountryRegion } from "@/lib/app-region";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

/** Keep continent focus aligned with the active country. */
export function syncMapRegionFocusForCountry(
  country: Pick<MapCountry, "name" | "region">,
): void {
  useMapUiStore
    .getState()
    .setFocusedRegion(normalizeCountryRegion(country).region);
}
