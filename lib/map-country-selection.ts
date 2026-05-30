import {
  logMapInteraction,
  selectionSourceToInteractionSource,
  selectionSourceToTrigger,
  type MapInteractionLogContext,
} from "@/lib/map-debug";
import { useExperienceStore } from "@/store/use-experience-store";
import {
  useIdentityStore,
  type SelectionSource,
} from "@/store/use-identity-store";
import type { MapCountry } from "@/types/country";

type SelectCountryDebugContext = MapInteractionLogContext & {
  trigger?: ReturnType<typeof selectionSourceToTrigger>;
  focusedContinent?: string | null;
  continentOverlay?: string | null;
  presentationMode?: string;
  isPreviewOpen?: boolean;
};

/** Identity first, then experience transitions — the only way to select a country. */
export function selectCountryOnMap(
  country: MapCountry,
  source: Exclude<SelectionSource, null>,
  debug?: SelectCountryDebugContext,
): void {
  const previous = useIdentityStore.getState().activeCountry;

  if (debug) {
    logMapInteraction({
      action: "country selected",
      source: selectionSourceToInteractionSource(source),
      trigger: debug.trigger ?? selectionSourceToTrigger(source),
      tappedCountry: country,
      tappedContinent: country.region,
      selectedCountry: previous,
      isSelected: previous?.name === country.name,
      focusedContinent: debug.focusedContinent ?? null,
      continentOverlay: debug.continentOverlay ?? null,
      presentationMode: debug.presentationMode,
      isPreviewOpen: debug.isPreviewOpen,
      viewport: debug.viewport,
      cameraTier: debug.cameraTier,
      is3d: debug.is3d,
      mapMode: debug.mapMode,
      extra: {
        selectionSource: source,
        previousCountry: previous?.name ?? null,
      },
    });
  }

  useIdentityStore.getState().setActiveCountry(country, source);
  useExperienceStore.getState().startTransition(source);
}
