import { HttpError } from "../lib/http.js";
import { normalizeImageDisplayWidth } from "../lib/upstream-validation.js";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../lib/validation.js";
import type { Country, CountryBasic } from "../types/country.js";
import { enrichCountryWithAi } from "./ai.service.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";
import { getFeedCountries } from "./country.service.js";
import {
  enrichCountryWithImages,
  type ImageDisplayOptions,
} from "./image.service.js";
import { enrichCountryWithVideos } from "./video.service.js";

export type FeedBatchResponse = {
  data: Country[];
  nextCursor: string | null;
};

const DEFAULT_LIMIT = DEFAULT_PAGE_LIMIT;
const MAX_LIMIT = MAX_PAGE_LIMIT;

function parseLimit(limit?: number): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new HttpError(
      "limit must be a positive integer",
      400,
      "INVALID_LIMIT",
    );
  }
  if (limit > MAX_LIMIT) {
    throw new HttpError(
      `limit must be at most ${MAX_LIMIT}`,
      400,
      "LIMIT_TOO_LARGE",
    );
  }
  return limit;
}

function parseCursor(cursor?: string): number {
  if (cursor === undefined || cursor.trim() === "") return 0;

  const offset = Number.parseInt(cursor, 10);
  if (!Number.isInteger(offset) || offset < 0) {
    throw new HttpError(
      "cursor must be a non-negative integer offset",
      400,
      "INVALID_CURSOR",
    );
  }

  return offset;
}

async function enrichCountry(
  country: CountryBasic,
  imageOptions: ImageDisplayOptions,
): Promise<Country> {
  const withImages = await enrichCountryWithImages(country, imageOptions);
  const withVideos = await enrichCountryWithVideos(withImages);
  return enrichCountryWithAi(withVideos);
}

async function buildFeedBatch(
  offset: number,
  limit: number,
  imageOptions: ImageDisplayOptions,
): Promise<FeedBatchResponse> {
  const allCountries = await getFeedCountries();
  const slice = allCountries.slice(offset, offset + limit);

  const data = await Promise.all(
    slice.map((country) => enrichCountry(country, imageOptions)),
  );

  const nextOffset = offset + limit;
  const nextCursor =
    nextOffset < allCountries.length ? String(nextOffset) : null;

  return { data, nextCursor };
}

export async function getFeedBatch(
  cursor?: string,
  limit?: number,
  imageOptions: ImageDisplayOptions = {},
): Promise<FeedBatchResponse> {
  const offset = parseCursor(cursor);
  const pageSize = parseLimit(limit);
  const displayWidth = normalizeImageDisplayWidth(imageOptions.displayWidthPx);
  const cacheKey = cacheKeys.feedCountries(
    `${offset}:${pageSize}`,
    displayWidth,
  );

  return getOrSet(cacheKey, CACHE_TTL.feed, () =>
    buildFeedBatch(offset, pageSize, imageOptions),
  );
}
