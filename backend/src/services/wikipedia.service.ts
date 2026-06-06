import type { CountryWikipediaSummary } from "../types/wikipedia.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheGet, cacheKeys, cacheSet } from "./cache.service.js";

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

const WIKI_RETRY_DELAYS_MS = [400, 900] as const;

async function fetchWikipedia(
  url: string,
  meta: Record<string, string>,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= WIKI_RETRY_DELAYS_MS.length; attempt += 1) {
    const response = await fetch(url, { headers: wikiHeaders() });
    lastResponse = response;

    if (response.status !== 429 || attempt === WIKI_RETRY_DELAYS_MS.length) {
      if (!response.ok) {
        logger.warn(meta.label, { ...meta, status: response.status });
      }
      return response;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, WIKI_RETRY_DELAYS_MS[attempt]),
    );
  }

  return lastResponse ?? new Response(null, { status: 503 });
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

  const response = await fetchWikipedia(url.toString(), {
    label: "Wikipedia opensearch error",
    query,
  });
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as WikipediaOpenSearchResponse;
  return data[1]?.[0] ?? null;
}

async function fetchWikipediaRestSummary(
  title: string,
): Promise<CountryWikipediaSummary | null> {
  const response = await fetchWikipedia(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${slugifyTitle(title)}`,
    {
      label: "Wikipedia summary error",
      title,
    },
  );

  if (!response.ok) {
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
  const cached = await cacheGet<CountryWikipediaSummary>(key);

  if (cached?.extract?.trim()) {
    return cached;
  }

  const fresh = await fetchWikipediaForCountry(countryName);
  if (fresh?.extract?.trim()) {
    await cacheSet(key, fresh, CACHE_TTL.wikipedia);
  }

  return fresh;
}
