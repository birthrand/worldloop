import type { CountryWikipediaSummary } from "../types/wikipedia.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_USER_AGENT =
  "WorldLoop/1.0 (country wikipedia service; learning project)";

type WikipediaOpenSearchResponse = [string, string[], string[], string[]];

type WikipediaRestSummary = {
  title?: string;
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
  content_urls?: {
    desktop?: { page?: string };
  };
};

function wikiHeaders(): HeadersInit {
  return { "User-Agent": WIKIPEDIA_USER_AGENT };
}

function slugifyTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, "_"));
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
  return data[1]?.[0] ?? null;
}

async function fetchWikipediaRestSummary(
  title: string,
): Promise<CountryWikipediaSummary | null> {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${slugifyTitle(title)}`,
    { headers: wikiHeaders() },
  );

  if (!response.ok) {
    logger.warn("Wikipedia summary error", {
      title,
      status: response.status,
    });
    return null;
  }

  const data = (await response.json()) as WikipediaRestSummary;
  const extract = data.extract?.trim();
  if (!extract) return null;

  const pageUrl = data.content_urls?.desktop?.page?.trim();
  if (!pageUrl) return null;

  return {
    title: data.title?.trim() || title,
    extract,
    description: data.description?.trim() || null,
    pageUrl,
    thumbnailUrl: data.thumbnail?.source?.trim() || null,
  };
}

async function fetchWikipediaForCountry(
  countryName: string,
): Promise<CountryWikipediaSummary | null> {
  const query = countryName.trim();
  if (!query) return null;

  const title = await resolveWikipediaPageTitle(query);
  if (!title) return null;

  return fetchWikipediaRestSummary(title);
}

export async function getWikipediaForCountry(
  countryName: string,
): Promise<CountryWikipediaSummary | null> {
  const key = cacheKeys.wikipedia(countryName);

  return getOrSet(key, CACHE_TTL.wikipedia, () =>
    fetchWikipediaForCountry(countryName),
  );
}
