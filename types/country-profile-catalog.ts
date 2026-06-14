import type { CountryLandmark } from "@/lib/api";

/** Wikipedia overview bundled for offline country detail. */
export type CountryProfileWikipedia = {
  title: string;
  extract: string;
  description: string | null;
  pageUrl: string;
  thumbnailUrl: string | null;
};

/** One static profile enrichment row (detail screen only). */
export type CountryProfileEntry = {
  name: string;
  cca2: string;
  wikipedia: CountryProfileWikipedia | null;
  landmarks: CountryLandmark[];
};

/** Top-level shape written to `data/country-profiles.json`. */
export type StaticCountryProfileCatalog = {
  version: number;
  generatedAt: string;
  count: number;
  profiles: CountryProfileEntry[];
};

export const PROFILE_CATALOG_VERSION = 1;

export const MIN_PROFILE_LANDMARKS = 0;
export const MAX_PROFILE_LANDMARKS = 5;
export const MIN_ENRICHED_PROFILE_RATIO = 0.9;
