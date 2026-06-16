import { STATIC_COUNTRY_PROFILE_CATALOG_ENABLED } from "@/constants/static-catalog";
import profilesJson from "@/data/country-profiles.json";
import type { CountryLandmark, CountryWikipediaSummary } from "@/lib/api";
import type { StaticCountryProfileCatalog } from "@/types/country-profile-catalog";

const catalog = profilesJson as StaticCountryProfileCatalog;

export type StaticCountryProfileData = {
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
};

let profilesByName: Map<string, StaticCountryProfileData> | null = null;

function ensureProfilesLoaded(): void {
  if (profilesByName) return;

  profilesByName = new Map(
    catalog.profiles.map((entry) => [
      entry.name.trim().toLowerCase(),
      {
        wikipedia: entry.wikipedia?.extract?.trim() ? entry.wikipedia : null,
        landmarks: entry.landmarks ?? [],
      },
    ]),
  );
}

export function isStaticCountryProfileCatalogEnabled(): boolean {
  return STATIC_COUNTRY_PROFILE_CATALOG_ENABLED && catalog.profiles.length > 0;
}

export function getStaticProfileCatalogCount(): number {
  return catalog.count;
}

export function getStaticCountryProfileByName(
  name: string,
): StaticCountryProfileData | null {
  if (!isStaticCountryProfileCatalogEnabled()) return null;

  ensureProfilesLoaded();
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return profilesByName?.get(key) ?? null;
}

export function isStaticCountryProfileEnriched(name: string): boolean {
  const profile = getStaticCountryProfileByName(name);
  return Boolean(
    profile?.wikipedia?.extract?.trim() ||
    (profile?.landmarks?.length ?? 0) > 0,
  );
}
