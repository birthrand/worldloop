import { env } from "../config/env.js";
import type { RawNewsArticle } from "../types/news.js";
import { logger } from "../utils/logger.js";
import { parseGNewsArticles } from "./upstream-validation.js";

const GNEWS_BASE = "https://gnews.io/api/v4";
const PROVIDER_TIMEOUT_MS = 8_000;

/** ISO 3166-1 alpha-2 codes supported by GNews top-headlines country filter. */
const GNEWS_TOP_HEADLINE_COUNTRIES = new Set([
  "ar",
  "au",
  "bd",
  "be",
  "bg",
  "br",
  "ca",
  "ch",
  "cl",
  "cn",
  "co",
  "cu",
  "cz",
  "de",
  "eg",
  "ee",
  "es",
  "et",
  "fi",
  "fr",
  "gb",
  "gr",
  "hk",
  "hu",
  "id",
  "ie",
  "il",
  "in",
  "ir",
  "it",
  "jp",
  "ke",
  "kr",
  "lt",
  "lv",
  "ma",
  "mx",
  "my",
  "ng",
  "nl",
  "no",
  "nz",
  "pe",
  "ph",
  "pk",
  "pl",
  "pt",
  "ro",
  "rs",
  "ru",
  "sa",
  "se",
  "sg",
  "si",
  "sk",
  "sn",
  "th",
  "tr",
  "tw",
  "tz",
  "ua",
  "ug",
  "us",
  "ve",
  "vn",
  "za",
  "ae",
  "at",
  "dk",
  "is",
]);

async function fetchGNewsUrl(url: URL): Promise<RawNewsArticle[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });

    if (response.status === 429) {
      logger.warn("GNews rate limited", { status: 429 });
      return [];
    }

    if (!response.ok) {
      logger.warn("GNews API error", { status: response.status });
      return [];
    }

    const data = await response.json();
    return parseGNewsArticles(data);
  } catch (error) {
    logger.warn("GNews request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFromGNews(
  countryName: string,
  cca2: string,
): Promise<RawNewsArticle[]> {
  if (!env.gnewsApiKey) return [];

  const code = cca2.trim().toLowerCase();

  if (code && GNEWS_TOP_HEADLINE_COUNTRIES.has(code)) {
    const headlinesUrl = new URL(`${GNEWS_BASE}/top-headlines`);
    headlinesUrl.searchParams.set("country", code);
    headlinesUrl.searchParams.set("lang", "en");
    headlinesUrl.searchParams.set("max", "10");
    headlinesUrl.searchParams.set("apikey", env.gnewsApiKey);

    const headlines = await fetchGNewsUrl(headlinesUrl);
    if (headlines.length > 0) return headlines;
  }

  const searchUrl = new URL(`${GNEWS_BASE}/search`);
  searchUrl.searchParams.set("q", `${countryName} news`);
  searchUrl.searchParams.set("lang", "en");
  searchUrl.searchParams.set("max", "10");
  searchUrl.searchParams.set("apikey", env.gnewsApiKey);

  return fetchGNewsUrl(searchUrl);
}
