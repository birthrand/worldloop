import type { Country } from "@/types/country";

import {
  openCountryDetail,
  warmCountryDetail,
  type CountryDetailOrigin,
} from "./open-country-detail";

/** @deprecated Use `warmCountryDetail` */
export function warmCountryAiExplorer(country: Country): void {
  warmCountryDetail(country);
}

/** @deprecated Use `openCountryDetail(country, { from })` */
export function openCountryAiExplorer(country: Country): void {
  openCountryDetail(country, { from: "explore" });
}

export type { CountryDetailOrigin };
