import { env } from "../config/env.js";
import { flagCdnUrlFromIso2 } from "../lib/flag-url.js";
import { fetchJson, HttpError } from "../lib/http.js";
import type { CountryBasic } from "../types/country.js";
import {
  CACHE_TTL,
  cacheKeys,
  getOrSet,
} from "./cache.service.js";

type RestCountry = {
  name?: { common?: string };
  capital?: string[];
  region?: string;
  population?: number;
  cca2?: string;
  latlng?: number[];
};

function normalizeCountry(raw: RestCountry): CountryBasic | null {
  const name = raw.name?.common?.trim();
  if (!name) return null;

  const lat = raw.latlng?.[0];
  const lng = raw.latlng?.[1];
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const cca2 = raw.cca2?.trim().toUpperCase();
  if (!cca2 || cca2.length !== 2) return null;

  return {
    name,
    capital: raw.capital?.[0] ?? "N/A",
    region: raw.region ?? "Unknown",
    population: raw.population ?? 0,
    cca2,
    flag: flagCdnUrlFromIso2(cca2),
    latlng: [lat, lng],
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

  const data = await fetchJson<RestCountry[]>(url);
  const normalized = normalizeMany(data);

  if (normalized.length === 0) {
    throw new HttpError(`Country not found: ${name}`, 404, "COUNTRY_NOT_FOUND");
  }

  const query = name.trim().toLowerCase();
  const exact = normalized.find((c) => c.name.toLowerCase() === query);
  return exact ?? normalized[0];
}

async function fetchAllCountriesFromApi(): Promise<CountryBasic[]> {
  const url = `${env.restCountriesBaseUrl}/all?fields=name,capital,region,population,cca2,latlng`;
  const data = await fetchJson<RestCountry[]>(url);
  return normalizeMany(data);
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
