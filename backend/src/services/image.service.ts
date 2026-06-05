import { env } from "../config/env.js";
import {
  parsePexelsResults,
  parseUnsplashResults,
} from "../lib/upstream-validation.js";
import type { CountryBasic } from "../types/country.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";

const MAX_IMAGES = 5;
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_USER_AGENT =
  "WorldLoop/1.0 (country image service; learning project)";

type WikipediaOpenSearchResponse = [string, string[], string[], string[]];

type WikipediaPageImagesQueryResponse = {
  query?: {
    pages?: Record<string, { images?: { title: string }[] }>;
  };
};

type WikipediaImageInfoQueryResponse = {
  query?: {
    pages?: Record<
      string,
      { imageinfo?: { thumburl?: string; url?: string }[] }
    >;
  };
};

type WikipediaSummaryResponse = {
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

export type CountryWithImages = CountryBasic & { images: string[] };

function wikiHeaders(): HeadersInit {
  return { "User-Agent": WIKIPEDIA_USER_AGENT };
}

function normalizeImageUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  if (value.startsWith("//")) {
    value = `https:${value}`;
  }

  if (/^https?:[^/]/i.test(value)) {
    value = value.replace(/^(https?):/i, "$1://");
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    url.protocol = "https:";
    if (url.hostname.toLowerCase() === "upload.wikipedia.org") {
      url.hostname = "upload.wikimedia.org";
    }
    return url.href;
  } catch {
    return null;
  }
}

function normalizeImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of urls) {
    const normalized = normalizeImageUrl(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function isUsefulWikipediaFile(filename: string): boolean {
  const name = filename.toLowerCase();
  if (!/\.(jpe?g|png|webp)$/.test(name)) return false;
  if (
    /icon|logo|wikimedia|ambox|edit-|question_book|commons-logo|symbol|puzzle/.test(
      name,
    )
  ) {
    return false;
  }
  return true;
}

async function fetchFromUnsplash(query: string): Promise<string[]> {
  if (!env.unsplashAccessKey) return [];

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", `${query} travel landscape`);
  url.searchParams.set("per_page", String(MAX_IMAGES));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${env.unsplashAccessKey}` },
  });

  if (!response.ok) {
    logger.warn("Unsplash API error", {
      query,
      status: response.status,
    });
    return [];
  }

  const data = await response.json();
  return normalizeImageUrls(parseUnsplashResults(data)).slice(0, MAX_IMAGES);
}

async function fetchFromPexels(query: string): Promise<string[]> {
  if (!env.pexelsApiKey) return [];

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", `${query} travel landscape`);
  url.searchParams.set("per_page", String(MAX_IMAGES));

  const response = await fetch(url.toString(), {
    headers: { Authorization: env.pexelsApiKey },
  });

  if (!response.ok) {
    logger.warn("Pexels API error", {
      query,
      status: response.status,
    });
    return [];
  }

  const data = await response.json();
  return normalizeImageUrls(parsePexelsResults(data)).slice(0, MAX_IMAGES);
}

async function resolveWikipediaPageTitle(
  query: string,
): Promise<string | null> {
  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "opensearch");
  url.searchParams.set("search", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("namespace", "0");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: wikiHeaders() });
  if (!response.ok) {
    logger.warn("Wikipedia opensearch error", {
      query,
      status: response.status,
    });
    return null;
  }

  const data = (await response.json()) as WikipediaOpenSearchResponse;
  const title = data[1]?.[0];
  return title ?? null;
}

async function fetchWikipediaSummaryImages(title: string): Promise<string[]> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
    { headers: wikiHeaders() },
  );

  if (!response.ok) return [];

  const data = (await response.json()) as WikipediaSummaryResponse;
  const urls: string[] = [];

  if (data.thumbnail?.source) urls.push(data.thumbnail.source);
  if (
    data.originalimage?.source &&
    data.originalimage.source !== data.thumbnail?.source
  ) {
    urls.push(data.originalimage.source);
  }

  return normalizeImageUrls(urls);
}

async function fetchWikipediaPageImageFiles(title: string): Promise<string[]> {
  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "images");
  url.searchParams.set("imlimit", "30");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: wikiHeaders() });
  if (!response.ok) return [];

  const data = (await response.json()) as WikipediaPageImagesQueryResponse;
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page?.images) return [];

  return page.images.map((img) => img.title).filter(isUsefulWikipediaFile);
}

async function resolveWikipediaImageUrls(files: string[]): Promise<string[]> {
  if (files.length === 0) return [];

  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", files.join("|"));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url");
  url.searchParams.set("iiurlwidth", "800");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: wikiHeaders() });
  if (!response.ok) return [];

  const data = (await response.json()) as WikipediaImageInfoQueryResponse;
  const pages = data.query?.pages ?? {};

  return normalizeImageUrls(
    Object.values(pages)
      .flatMap((page) => page.imageinfo ?? [])
      .map((info) => info.thumburl ?? info.url)
      .filter((url): url is string => Boolean(url)),
  );
}

async function fetchFromWikipedia(query: string): Promise<string[]> {
  const title = await resolveWikipediaPageTitle(query);
  if (!title) return [];

  const urls: string[] = [];

  for (const url of await fetchWikipediaSummaryImages(title)) {
    if (!urls.includes(url)) urls.push(url);
  }

  if (urls.length < MAX_IMAGES) {
    const files = await fetchWikipediaPageImageFiles(title);
    const fileUrls = await resolveWikipediaImageUrls(
      files.slice(0, MAX_IMAGES * 2),
    );

    for (const url of fileUrls) {
      if (!urls.includes(url)) urls.push(url);
      if (urls.length >= MAX_IMAGES) break;
    }
  }

  return normalizeImageUrls(urls).slice(0, MAX_IMAGES);
}

async function fetchImagesFromApis(countryName: string): Promise<string[]> {
  const query = countryName.trim();

  const unsplashUrls = await fetchFromUnsplash(query);
  if (unsplashUrls.length > 0) {
    logger.debug("Images fetched from Unsplash", {
      country: query,
      count: unsplashUrls.length,
    });
    return unsplashUrls;
  }

  const pexelsUrls = await fetchFromPexels(query);
  if (pexelsUrls.length > 0) {
    logger.debug("Images fetched from Pexels", {
      country: query,
      count: pexelsUrls.length,
    });
    return pexelsUrls;
  }

  try {
    const wikipediaUrls = await fetchFromWikipedia(query);
    if (wikipediaUrls.length > 0) {
      logger.debug("Images fetched from Wikipedia", {
        country: query,
        count: wikipediaUrls.length,
      });
      return wikipediaUrls;
    }
  } catch (error) {
    logger.warn("Wikipedia image fetch failed", {
      country: query,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.debug("No images found for country", { country: query });
  return [];
}

export async function getImagesForCountry(
  countryName: string,
): Promise<string[]> {
  const key = cacheKeys.images(countryName);

  return getOrSet(key, CACHE_TTL.images, () =>
    fetchImagesFromApis(countryName),
  );
}

export async function enrichCountryWithImages(
  country: CountryBasic,
): Promise<CountryWithImages> {
  const images = await getImagesForCountry(country.name);
  return { ...country, images };
}

export async function enrichCountriesWithImages(
  countries: CountryBasic[],
): Promise<CountryWithImages[]> {
  return Promise.all(countries.map(enrichCountryWithImages));
}
