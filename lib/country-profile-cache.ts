import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import type { CountryLandmark, CountryWikipediaSummary } from "@/lib/api";
import { getClientCache, setClientCache } from "@/lib/client-cache";
import { getStaticCountryByName } from "@/lib/static-countries";
import {
  getStaticCountryProfileByName,
  isStaticCountryProfileCatalogEnabled,
  isStaticCountryProfileEnriched,
} from "@/lib/static-country-profiles";
import type { Country } from "@/types/country";

export type CachedCountryProfile = {
  country: Country;
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
};

const memory = new Map<string, CachedCountryProfile>();
const hydrateInFlight = new Map<string, Promise<CachedCountryProfile | null>>();

function cacheKey(name: string): string {
  return name.trim().toLowerCase();
}

function mergeCountryData(
  existing: Country | undefined,
  incoming: Country,
): Country {
  return {
    ...existing,
    ...incoming,
    images: incoming.images?.length ? incoming.images : existing?.images,
    ai: incoming.ai ?? existing?.ai,
    languages: incoming.languages?.length
      ? incoming.languages
      : existing?.languages,
    subregion: incoming.subregion ?? existing?.subregion,
    area: incoming.area ?? existing?.area,
    landlocked: incoming.landlocked ?? existing?.landlocked,
    timezones: incoming.timezones?.length
      ? incoming.timezones
      : existing?.timezones,
  };
}

function mergeProfiles(
  existing: CachedCountryProfile | undefined,
  incoming: CachedCountryProfile,
): CachedCountryProfile {
  return {
    country: mergeCountryData(existing?.country, incoming.country),
    wikipedia: incoming.wikipedia?.extract?.trim()
      ? incoming.wikipedia
      : (existing?.wikipedia ?? null),
    landmarks:
      incoming.landmarks.length > 0
        ? incoming.landmarks
        : (existing?.landmarks ?? []),
  };
}

async function persistProfileToDisk(
  name: string,
  profile: CachedCountryProfile,
): Promise<void> {
  await setClientCache(
    CLIENT_CACHE_KEYS.countryProfile(name),
    profile,
    CLIENT_CACHE_TTL.countryProfile,
  );
}

function setMemoryProfile(
  name: string,
  profile: CachedCountryProfile,
): CachedCountryProfile {
  const key = cacheKey(name);
  const merged = mergeProfiles(memory.get(key), profile);
  memory.set(key, merged);
  return merged;
}

export function getCachedCountryProfile(
  name: string,
): CachedCountryProfile | undefined {
  return memory.get(cacheKey(name));
}

export function isCountryProfileEnriched(
  profile: CachedCountryProfile | undefined,
  countryName?: string,
): boolean {
  if (
    profile?.wikipedia?.extract?.trim() ||
    (profile?.landmarks?.length ?? 0) > 0
  ) {
    return true;
  }

  const name = countryName?.trim() || profile?.country?.name?.trim();
  if (name && isStaticCountryProfileCatalogEnabled()) {
    return isStaticCountryProfileEnriched(name);
  }

  return false;
}

function resolveStaticEnrichment(name: string): {
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
} {
  const staticProfile = getStaticCountryProfileByName(name);
  return {
    wikipedia: staticProfile?.wikipedia ?? null,
    landmarks: staticProfile?.landmarks ?? [],
  };
}

/** Hydrate memory from bundled profile enrichment when available. */
export function seedStaticCountryProfileIfAvailable(
  name: string,
  country?: Country,
): CachedCountryProfile | null {
  const trimmed = name.trim();
  if (!trimmed || !isStaticCountryProfileCatalogEnabled()) return null;
  if (!isStaticCountryProfileEnriched(trimmed)) return null;

  const resolvedCountry = country ?? getStaticCountryByName(trimmed);
  if (!resolvedCountry) return null;

  const enrichment = resolveStaticEnrichment(trimmed);
  return setMemoryProfile(trimmed, {
    country: resolvedCountry,
    wikipedia: enrichment.wikipedia,
    landmarks: enrichment.landmarks,
  });
}

/** Full explorer payload from API — memory always; disk only when Wikipedia is present. */
export function setCachedCountryProfile(
  name: string,
  profile: CachedCountryProfile,
): CachedCountryProfile {
  const merged = setMemoryProfile(name, profile);
  if (isCountryProfileEnriched(merged)) {
    void persistProfileToDisk(name, merged);
  }
  return merged;
}

/**
 * Fast path from feed/map — memory only so partial feed rows do not
 * overwrite a complete on-disk profile.
 */
export function seedCachedCountryProfile(country: Country): void {
  const existing = getCachedCountryProfile(country.name);
  const staticEnrichment = isStaticCountryProfileCatalogEnabled()
    ? resolveStaticEnrichment(country.name)
    : null;

  setMemoryProfile(country.name, {
    country,
    wikipedia: existing?.wikipedia?.extract?.trim()
      ? existing.wikipedia
      : (staticEnrichment?.wikipedia ?? null),
    landmarks:
      (existing?.landmarks?.length ?? 0) > 0
        ? (existing?.landmarks ?? [])
        : (staticEnrichment?.landmarks ?? []),
  });
}

/** Load a cached profile from AsyncStorage into memory when needed. */
export async function hydrateCountryProfileFromDisk(
  name: string,
): Promise<CachedCountryProfile | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const key = cacheKey(trimmed);
  const inMemory = getCachedCountryProfile(trimmed);
  if (inMemory && isCountryProfileEnriched(inMemory, trimmed)) {
    return inMemory;
  }

  seedStaticCountryProfileIfAvailable(trimmed);
  const afterStatic = getCachedCountryProfile(trimmed);
  if (afterStatic && isCountryProfileEnriched(afterStatic, trimmed)) {
    return afterStatic;
  }

  const inFlight = hydrateInFlight.get(key);
  if (inFlight) return inFlight;

  const task = (async () => {
    const disk = await getClientCache<CachedCountryProfile>(
      CLIENT_CACHE_KEYS.countryProfile(trimmed),
    );
    if (!disk.data) return inMemory ?? null;

    return setMemoryProfile(trimmed, disk.data);
  })().finally(() => {
    hydrateInFlight.delete(key);
  });

  hydrateInFlight.set(key, task);
  return task;
}
