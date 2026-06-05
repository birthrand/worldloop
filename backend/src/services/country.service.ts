import { env } from "../config/env.js";
import { normalizeAppRegion } from "../lib/app-region.js";
import { flagCdnUrlFromIso2 } from "../lib/flag-url.js";
import { fetchJson, HttpError } from "../lib/http.js";
import {
  assertJsonArray,
  assertNonEmptyArray,
} from "../lib/upstream-validation.js";
import type { CountryBasic } from "../types/country.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";

type RestCountry = {
  name?: { common?: string };
  capital?: string[];
  region?: string;
  subregion?: string;
  population?: number;
  cca2?: string;
  latlng?: number[];
  area?: number;
  landlocked?: boolean;
  timezones?: string[];
  languages?: Record<string, string>;
};

function normalizeCountry(raw: RestCountry): CountryBasic | null {
  const name = raw.name?.common?.trim();
  if (!name) return null;

  const lat = raw.latlng?.[0];
  const lng = raw.latlng?.[1];
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const cca2 = raw.cca2?.trim().toUpperCase();
  if (!cca2 || cca2.length !== 2) return null;

  const apiRegion = raw.region ?? "Unknown";
  const languages = raw.languages
    ? Object.values(raw.languages)
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    : [];

  return {
    name,
    capital: raw.capital?.[0] ?? "N/A",
    region: normalizeAppRegion(apiRegion, raw.subregion, name),
    population: raw.population ?? 0,
    cca2,
    flag: flagCdnUrlFromIso2(cca2),
    latlng: [lat, lng],
    subregion: raw.subregion?.trim() || undefined,
    area:
      typeof raw.area === "number" && raw.area > 0 ? raw.area : undefined,
    landlocked:
      typeof raw.landlocked === "boolean" ? raw.landlocked : undefined,
    timezones: raw.timezones
      ?.map((zone) => zone?.trim())
      .filter((zone): zone is string => Boolean(zone)),
    languages,
  };
}

function normalizeMany(rawList: RestCountry[]): CountryBasic[] {
  return rawList
    .map(normalizeCountry)
    .filter((c): c is CountryBasic => c !== null);
}

/** Fisher–Yates shuffle; mutates a copy so feed order stays stable while cached. */
function shuffleCountries<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

async function fetchCountryFromApi(name: string): Promise<CountryBasic> {
  const encoded = encodeURIComponent(name.trim());
  const url = `${env.restCountriesBaseUrl}/name/${encoded}`;

  const data = assertJsonArray<RestCountry>(
    await fetchJson<unknown>(url),
    "REST Countries API",
  );
  const normalized = normalizeMany(data);

  if (normalized.length === 0) {
    throw new HttpError(`Country not found: ${name}`, 404, "COUNTRY_NOT_FOUND");
  }

  const query = name.trim().toLowerCase();
  const exact = normalized.find((c) => c.name.toLowerCase() === query);
  return exact ?? normalized[0];
}

async function fetchAllCountriesFromApi(): Promise<CountryBasic[]> {
  const url = `${env.restCountriesBaseUrl}/all?fields=name,capital,region,subregion,population,cca2,latlng,area,landlocked,timezones,languages`;
  const data = assertJsonArray<RestCountry>(
    await fetchJson<unknown>(url),
    "REST Countries API",
  );
  return assertNonEmptyArray(normalizeMany(data), "REST Countries API");
}

export async function getCountryByName(name: string): Promise<CountryBasic> {
  const key = cacheKeys.country(name);

  return getOrSet(key, CACHE_TTL.country, () => fetchCountryFromApi(name));
}

export async function getFeedCountries(): Promise<CountryBasic[]> {
  const key = cacheKeys.feedCountries("all");

  return getOrSet(key, CACHE_TTL.feed, async () => {
    const countries = await fetchAllCountriesFromApi();
    return shuffleCountries(countries);
  });
}
