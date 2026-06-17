import { useMemo } from "react";

import { resolveVisitCountryId } from "@/lib/discovery-progress";
import {
  getStaticCountries,
  isStaticCountryCatalogEnabled,
} from "@/lib/static-countries";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import {
  useDiscoveryProgressStore,
  type VisitedCountrySnapshot,
} from "@/store/use-discovery-progress-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

function snapshotToMinimalCountry(snapshot: VisitedCountrySnapshot): Country {
  return {
    name: snapshot.name,
    cca2: snapshot.cca2,
    flag: snapshot.flag,
    population: 0,
    region: "",
    capital: "",
    images: [],
    latlng: [0, 0],
  };
}

function buildCountryLookup(countries: Country[]): Map<string, Country> {
  const byId = new Map<string, Country>();

  for (const country of countries) {
    const id = resolveVisitCountryId(country);
    if (id && !byId.has(id)) {
      byId.set(id, country);
    }
  }

  return byId;
}

export function useVisitedCountriesList(): Country[] {
  const visitedCountryIds = useDiscoveryProgressStore(
    (s) => s.visitedCountryIds,
  );
  const visitedAtByCountryId = useDiscoveryProgressStore(
    (s) => s.visitedAtByCountryId,
  );
  const visitedCountryById = useDiscoveryProgressStore(
    (s) => s.visitedCountryById,
  );
  const feedCountries = useCountryFeedStore((s) => s.countries);
  const savedCountries = useSavedCountriesStore((s) => s.savedCountries);

  return useMemo(() => {
    const catalogCountries = isStaticCountryCatalogEnabled()
      ? getStaticCountries()
      : [];

    const byId = buildCountryLookup([
      ...feedCountries,
      ...catalogCountries,
      ...savedCountries,
    ]);

    for (const [id, snapshot] of Object.entries(visitedCountryById)) {
      if (!byId.has(id)) {
        byId.set(id, snapshotToMinimalCountry(snapshot));
      }
    }

    return visitedCountryIds
      .map((id) => byId.get(id))
      .filter((country): country is Country => country != null)
      .sort((a, b) => {
        const aTime = visitedAtByCountryId[resolveVisitCountryId(a)] ?? 0;
        const bTime = visitedAtByCountryId[resolveVisitCountryId(b)] ?? 0;
        return bTime - aTime;
      });
  }, [
    feedCountries,
    savedCountries,
    visitedAtByCountryId,
    visitedCountryById,
    visitedCountryIds,
  ]);
}
