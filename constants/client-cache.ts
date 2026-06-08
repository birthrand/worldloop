export const CLIENT_CACHE_SCHEMA_VERSION = 1;

export const CLIENT_CACHE_KEYS = {
  schemaVersion: "cache:meta:schemaVersion",
  mapCountries: "cache:map:countries",
  countryDetail: (name: string) => `cache:country:${name.trim().toLowerCase()}`,
  countryProfile: (name: string) =>
    `cache:country-profile:${name.trim().toLowerCase()}`,
  feedFirstPage: "cache:feed:countries:cursor=all",
  feedRegion: (region: string) =>
    `cache:feed:region:${region.trim().toLowerCase()}`,
  search: (query: string, region: string) =>
    `cache:search:${query.trim().toLowerCase()}:${region.trim().toLowerCase()}`,
  discover: (bboxKey: string) => `cache:discover:${bboxKey}`,
} as const;

/** Align with prompts-worldloop TTLs where it matters. */
export const CLIENT_CACHE_TTL = {
  mapCountries: 30 * 24 * 60 * 60, // 30d — match backend map TTL
  countryDetail: 7 * 24 * 60 * 60, // 7d — AI + images can change
  countryProfile: 30 * 24 * 60 * 60, // 30d — Wikipedia + landmarks
  feedFirstPage: 24 * 60 * 60, // 1d — feed order is shuffled server-side
  feedRegion: 7 * 24 * 60 * 60,
  search: 7 * 24 * 60 * 60, // 7d — match backend search TTL
  discover: 24 * 60 * 60, // 24h — match backend discover TTL
} as const;
