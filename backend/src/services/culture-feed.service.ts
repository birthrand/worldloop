import { HttpError } from "../lib/http.js";
import { normalizeImageDisplayWidth } from "../lib/upstream-validation.js";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../lib/validation.js";
import type { Country, CountryBasic } from "../types/country.js";
import { enrichCountryWithAi } from "./ai.service.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";
import { getAllCountryBasics } from "./country.service.js";
import {
  enrichCountryWithImages,
  type ImageDisplayOptions,
} from "./image.service.js";
import { getVideosForCountry } from "./video.service.js";

export type CultureFeedBatchResponse = {
  data: Country[];
  nextCursor: string | null;
  meta: {
    total: number;
    seed: string;
  };
};

const DEFAULT_LIMIT = DEFAULT_PAGE_LIMIT;
const MAX_LIMIT = MAX_PAGE_LIMIT;
const INDEX_BATCH_SIZE = 12;
const DEFAULT_SEED = "default";
const MAX_SEED_LENGTH = 64;

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

export function parseCultureFeedSeed(raw?: string): string {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_SEED;
  }

  const seed = raw.trim();
  if (seed.length > MAX_SEED_LENGTH) {
    throw new HttpError(
      `seed must be at most ${MAX_SEED_LENGTH} characters`,
      400,
      "INVALID_SEED",
    );
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(seed)) {
    throw new HttpError(
      "seed must contain only letters, numbers, dots, dashes, or underscores",
      400,
      "INVALID_SEED",
    );
  }

  return seed;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const list = [...items];
  const random = createSeededRng(seed);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

async function buildCultureVideoIndex(): Promise<CountryBasic[]> {
  const countries = await getAllCountryBasics();
  const withVideos: CountryBasic[] = [];

  for (let i = 0; i < countries.length; i += INDEX_BATCH_SIZE) {
    const batch = countries.slice(i, i + INDEX_BATCH_SIZE);
    const resolved = await Promise.all(
      batch.map(async (country) => {
        const videos = await getVideosForCountry(country.name);
        return videos.length > 0 ? country : null;
      }),
    );
    withVideos.push(
      ...resolved.filter(
        (country): country is CountryBasic => country !== null,
      ),
    );
  }

  return withVideos;
}

async function getCultureVideoIndex(): Promise<CountryBasic[]> {
  return getOrSet(
    cacheKeys.cultureVideoIndex(),
    CACHE_TTL.feed,
    buildCultureVideoIndex,
  );
}

async function enrichCultureCountry(
  country: CountryBasic,
  imageOptions: ImageDisplayOptions,
): Promise<Country> {
  const withImages = await enrichCountryWithImages(country, imageOptions);
  const videos = await getVideosForCountry(withImages.name, withImages.images);
  const withVideos = { ...withImages, videos };
  return enrichCountryWithAi(withVideos);
}

async function buildCultureFeedBatch(
  seed: string,
  offset: number,
  limit: number,
  imageOptions: ImageDisplayOptions,
): Promise<CultureFeedBatchResponse> {
  const videoCountries = await getCultureVideoIndex();
  const ordered = seededShuffle(videoCountries, seed);
  const slice = ordered.slice(offset, offset + limit);

  const data = await Promise.all(
    slice.map((country) => enrichCultureCountry(country, imageOptions)),
  );

  const nextOffset = offset + limit;
  const nextCursor = nextOffset < ordered.length ? String(nextOffset) : null;

  return {
    data,
    nextCursor,
    meta: {
      total: ordered.length,
      seed,
    },
  };
}

export async function getCultureFeedBatch(
  seed?: string,
  cursor?: string,
  limit?: number,
  imageOptions: ImageDisplayOptions = {},
): Promise<CultureFeedBatchResponse> {
  const parsedSeed = parseCultureFeedSeed(seed);
  const offset = parseCursor(cursor);
  const pageSize = parseLimit(limit);
  const displayWidth = normalizeImageDisplayWidth(imageOptions.displayWidthPx);
  const cacheKey = cacheKeys.cultureFeed(
    parsedSeed,
    String(offset),
    pageSize,
    displayWidth,
  );

  return getOrSet(cacheKey, CACHE_TTL.feed, () =>
    buildCultureFeedBatch(parsedSeed, offset, pageSize, imageOptions),
  );
}
