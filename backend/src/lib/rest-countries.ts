import { env } from "../config/env.js";
import type { CountryBasic } from "../types/country.js";
import { logger } from "../utils/logger.js";
import { normalizeAppRegion } from "./app-region.js";
import { flagCdnUrlFromIso2 } from "./flag-url.js";
import { HttpError } from "./http.js";

const REST_COUNTRIES_LIST_FIELDS =
  "names.common,capitals,region,subregion,population,codes.alpha_2,coordinates,area.kilometers,languages,landlocked,timezones";

type RestCountryV5 = Record<string, unknown>;

type RestCountriesV5Response = {
  data?: {
    objects?: RestCountryV5[];
    meta?: {
      more?: boolean;
      total?: number;
      count?: number;
      limit?: number;
      offset?: number;
    };
  };
  errors?: Array<{ message?: string }>;
};

function readField(raw: RestCountryV5, path: string): unknown {
  if (path in raw) {
    return raw[path];
  }

  const parts = path.split(".");
  let current: unknown = raw;
  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function readString(raw: RestCountryV5, path: string): string | undefined {
  const value = readField(raw, path);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(raw: RestCountryV5, path: string): number | undefined {
  const value = readField(raw, path);
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readBoolean(raw: RestCountryV5, path: string): boolean | undefined {
  const value = readField(raw, path);
  return typeof value === "boolean" ? value : undefined;
}

function readCapital(raw: RestCountryV5): string | undefined {
  const capitals = readField(raw, "capitals");
  if (!Array.isArray(capitals) || capitals.length === 0) {
    return undefined;
  }

  const first = capitals[0];
  if (!first || typeof first !== "object") {
    return undefined;
  }

  const name = (first as Record<string, unknown>).name;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

function readLanguages(raw: RestCountryV5): string[] {
  const languages = readField(raw, "languages");
  if (!Array.isArray(languages)) {
    return [];
  }

  return languages
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const name = (entry as Record<string, unknown>).name;
      return typeof name === "string" && name.trim() ? name.trim() : null;
    })
    .filter((value): value is string => Boolean(value));
}

function readTimezones(raw: RestCountryV5): string[] | undefined {
  const timezones = readField(raw, "timezones");
  if (!Array.isArray(timezones)) {
    return undefined;
  }

  const values = timezones
    .map((zone) => (typeof zone === "string" ? zone.trim() : ""))
    .filter(Boolean);

  return values.length > 0 ? values : undefined;
}

export function normalizeRestCountryV5(
  raw: RestCountryV5,
): CountryBasic | null {
  const name = readString(raw, "names.common");
  if (!name) return null;

  const lat = readNumber(raw, "coordinates.lat");
  const lng = readNumber(raw, "coordinates.lng");
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  const cca2 = readString(raw, "codes.alpha_2")?.toUpperCase();
  if (!cca2 || cca2.length !== 2) {
    return null;
  }

  const apiRegion = readString(raw, "region") ?? "Unknown";
  const area = readNumber(raw, "area.kilometers");

  return {
    name,
    capital: readCapital(raw) ?? "N/A",
    region: normalizeAppRegion(apiRegion, readString(raw, "subregion"), name),
    population: readNumber(raw, "population") ?? 0,
    cca2,
    flag: flagCdnUrlFromIso2(cca2),
    latlng: [lat, lng],
    subregion: readString(raw, "subregion"),
    area: typeof area === "number" && area > 0 ? area : undefined,
    landlocked: readBoolean(raw, "landlocked"),
    timezones: readTimezones(raw),
    languages: readLanguages(raw),
  };
}

export function normalizeRestCountriesV5(
  rawList: RestCountryV5[],
): CountryBasic[] {
  return rawList
    .map(normalizeRestCountryV5)
    .filter((country): country is CountryBasic => country !== null);
}

function buildRestCountriesUrl(pathAndQuery: string): string {
  const base = env.restCountriesBaseUrl.replace(/\/$/, "");
  if (pathAndQuery.startsWith("?")) {
    return `${base}${pathAndQuery}`;
  }
  if (pathAndQuery.startsWith("/")) {
    return `${base}${pathAndQuery}`;
  }
  return `${base}/${pathAndQuery}`;
}

function assertRestCountriesConfigured(): void {
  if (!env.restCountriesApiKey.trim()) {
    throw new HttpError(
      "REST Countries API key is not configured. Set REST_COUNTRIES_API_KEY in backend/.env (free key: https://restcountries.com/sign-up).",
      503,
      "REST_COUNTRIES_NOT_CONFIGURED",
    );
  }
}

export async function fetchRestCountries(
  pathAndQuery: string,
): Promise<RestCountriesV5Response> {
  assertRestCountriesConfigured();

  const url = buildRestCountriesUrl(pathAndQuery);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.restCountriesApiKey.trim()}`,
      },
    });
  } catch (error) {
    logger.error("REST Countries request failed", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpError("Failed to reach REST Countries API", 502);
  }

  let payload: RestCountriesV5Response;
  try {
    payload = (await response.json()) as RestCountriesV5Response;
  } catch {
    throw new HttpError("Invalid response from REST Countries API", 502);
  }

  if (payload.errors?.length) {
    const message =
      payload.errors
        .map((entry) => entry.message)
        .filter(Boolean)
        .join("; ") || "REST Countries API error";
    logger.warn("REST Countries API returned errors", { url, message });
    throw new HttpError(
      message,
      response.ok ? 502 : response.status,
      "REST_COUNTRIES_ERROR",
    );
  }

  if (response.status === 404) {
    throw new HttpError("Country not found", 404, "COUNTRY_NOT_FOUND");
  }

  if (!response.ok) {
    logger.error("REST Countries API returned error", {
      url,
      status: response.status,
    });
    throw new HttpError("REST Countries API error", 502);
  }

  return payload;
}

export function getRestCountriesObjects(
  payload: RestCountriesV5Response,
): RestCountryV5[] {
  const objects = payload.data?.objects;
  if (!Array.isArray(objects)) {
    throw new HttpError(
      "Invalid response from REST Countries API",
      502,
      "UPSTREAM_INVALID",
    );
  }

  return objects;
}

export async function fetchRestCountryByName(
  name: string,
): Promise<CountryBasic> {
  const query = name.trim();
  if (!query) {
    throw new HttpError("Country name is required", 400, "VALIDATION_ERROR");
  }

  const encoded = encodeURIComponent(query);
  const payload = await fetchRestCountries(
    `/names.common/${encoded}?response_fields=${REST_COUNTRIES_LIST_FIELDS}`,
  );
  const normalized = normalizeRestCountriesV5(getRestCountriesObjects(payload));

  if (normalized.length === 0) {
    throw new HttpError(`Country not found: ${name}`, 404, "COUNTRY_NOT_FOUND");
  }

  const exact = normalized.find(
    (country) => country.name.toLowerCase() === query.toLowerCase(),
  );
  return exact ?? normalized[0];
}

export async function fetchAllRestCountries(): Promise<CountryBasic[]> {
  const pageSize = 100;
  const allObjects: RestCountryV5[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const payload = await fetchRestCountries(
      `?limit=${pageSize}&offset=${offset}&response_fields=${REST_COUNTRIES_LIST_FIELDS}`,
    );
    const objects = getRestCountriesObjects(payload);
    allObjects.push(...objects);

    const meta = payload.data?.meta;
    hasMore = Boolean(meta?.more);
    offset += objects.length;

    if (objects.length === 0) {
      break;
    }
  }

  const normalized = normalizeRestCountriesV5(allObjects);
  if (normalized.length === 0) {
    throw new HttpError(
      "Invalid response from REST Countries API",
      502,
      "UPSTREAM_INVALID",
    );
  }

  return normalized;
}
