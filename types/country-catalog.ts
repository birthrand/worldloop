import type { Country } from "@/types/country";

/** One fully enriched static catalog row (explore-ready). */
export type CountryCatalogEntry = Country & {
  images: string[];
  ai: NonNullable<Country["ai"]>;
};

/** Top-level shape written to `data/countries.json`. */
export type StaticCountryCatalog = {
  version: number;
  generatedAt: string;
  count: number;
  countries: CountryCatalogEntry[];
};

export const CATALOG_VERSION = 1;

export const MIN_CATALOG_COUNTRIES = 180;
export const TARGET_CATALOG_COUNTRIES = 190;
export const MIN_CATALOG_IMAGES = 3;
export const MAX_CATALOG_IMAGES = 5;
