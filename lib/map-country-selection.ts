import { logMapDebug, summarizeCountry } from "@/lib/map-debug";
import { useExperienceStore } from "@/store/use-experience-store";
import {
  useIdentityStore,
  type SelectionSource,
} from "@/store/use-identity-store";
import type { MapCountry } from "@/types/country";

/** Identity first, then experience transitions — the only way to select a country. */
export function selectCountryOnMap(
  country: MapCountry,
  source: Exclude<SelectionSource, null>,
): void {
  logMapDebug("selection", "selectCountryOnMap", {
    source,
    country: summarizeCountry(country),
  });
  useIdentityStore.getState().setActiveCountry(country, source);
  useExperienceStore.getState().startTransition(source);
}
