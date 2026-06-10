import { HttpError } from "./http.js";
import {
  MAX_IMAGE_DISPLAY_WIDTH,
  MIN_IMAGE_DISPLAY_WIDTH,
  normalizeImageDisplayWidth,
} from "./upstream-validation.js";

export const MAX_PAGE_LIMIT = 30;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_QUERY_LENGTH = 100;
export const MAX_COUNTRY_NAME_LENGTH = 100;

/** Continents used for search/discover region filters (matches mobile `constants/regions.ts`). */
export const VALID_REGIONS = new Set([
  "Africa",
  "North America",
  "South America",
  "Antarctic",
  "Asia",
  "Europe",
  "Oceania",
]);

const COUNTRY_NAME_PATTERN = /^[\p{L}\p{M}\s'.()-]+$/u;

export function parseCountryName(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError("Country name is required", 400, "INVALID_NAME");
  }

  const name = decodeURIComponent(value).trim();

  if (name.length > MAX_COUNTRY_NAME_LENGTH) {
    throw new HttpError(
      `Country name must be at most ${MAX_COUNTRY_NAME_LENGTH} characters`,
      400,
      "INVALID_NAME",
    );
  }

  if (!COUNTRY_NAME_PATTERN.test(name)) {
    throw new HttpError(
      "Country name contains invalid characters",
      400,
      "INVALID_NAME",
    );
  }

  return name;
}

/** Logical CSS width × device pixel ratio, used to pick a hero image rendition. */
export function parseOptionalDisplayWidth(raw: unknown): number | undefined {
  if (raw === undefined) return undefined;

  if (typeof raw !== "string" || raw.trim() === "") {
    throw new HttpError(
      "displayWidth must be a number",
      400,
      "INVALID_DISPLAY_WIDTH",
    );
  }

  if (!/^\d+$/.test(raw)) {
    throw new HttpError(
      "displayWidth must be a number",
      400,
      "INVALID_DISPLAY_WIDTH",
    );
  }

  const parsed = Number.parseInt(raw, 10);

  if (parsed < MIN_IMAGE_DISPLAY_WIDTH) {
    throw new HttpError(
      `displayWidth must be at least ${MIN_IMAGE_DISPLAY_WIDTH}`,
      400,
      "INVALID_DISPLAY_WIDTH",
    );
  }

  if (parsed > MAX_IMAGE_DISPLAY_WIDTH) {
    throw new HttpError(
      `displayWidth must be at most ${MAX_IMAGE_DISPLAY_WIDTH}`,
      400,
      "INVALID_DISPLAY_WIDTH",
    );
  }

  return normalizeImageDisplayWidth(parsed);
}

export function parseOptionalLimit(raw: unknown): number | undefined {
  if (raw === undefined) return undefined;

  if (typeof raw !== "string" || raw.trim() === "") {
    throw new HttpError("limit must be a number", 400, "INVALID_LIMIT");
  }

  if (!/^\d+$/.test(raw)) {
    throw new HttpError("limit must be a number", 400, "INVALID_LIMIT");
  }

  const parsed = Number.parseInt(raw, 10);

  if (parsed <= 0) {
    throw new HttpError("limit must be greater than 0", 400, "INVALID_LIMIT");
  }

  if (parsed > MAX_PAGE_LIMIT) {
    throw new HttpError(
      `limit must be at most ${MAX_PAGE_LIMIT}`,
      400,
      "LIMIT_TOO_LARGE",
    );
  }

  return parsed;
}

export function parseLimit(
  raw: unknown,
  defaultLimit = DEFAULT_PAGE_LIMIT,
): number {
  const parsed = parseOptionalLimit(raw);
  return parsed ?? defaultLimit;
}

export function parseCursor(raw: unknown): number {
  if (raw === undefined) return 0;

  if (typeof raw !== "string" || raw.trim() === "") {
    throw new HttpError("cursor must be a number", 400, "INVALID_CURSOR");
  }

  if (!/^\d+$/.test(raw)) {
    throw new HttpError("cursor must be a number", 400, "INVALID_CURSOR");
  }

  return Number.parseInt(raw, 10);
}

export function parseOptionalSearchQuery(raw: unknown): string | undefined {
  if (raw === undefined) return undefined;

  if (typeof raw !== "string") {
    throw new HttpError("query must be a string", 400, "INVALID_QUERY");
  }

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new HttpError(
      `query must be at most ${MAX_QUERY_LENGTH} characters`,
      400,
      "INVALID_QUERY",
    );
  }

  return trimmed;
}

export function parseOptionalRegion(raw: unknown): string | undefined {
  if (raw === undefined) return undefined;

  if (typeof raw !== "string") {
    throw new HttpError("region must be a string", 400, "INVALID_REGION");
  }

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new HttpError(
      `region must be at most ${MAX_QUERY_LENGTH} characters`,
      400,
      "INVALID_REGION",
    );
  }

  const matched = [...VALID_REGIONS].find(
    (region) => region.toLowerCase() === trimmed.toLowerCase(),
  );

  if (!matched) {
    throw new HttpError(
      "region is not a supported continent",
      400,
      "INVALID_REGION",
    );
  }

  return matched;
}
