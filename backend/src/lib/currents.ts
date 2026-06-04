import { env } from "../config/env.js";
import type { RawNewsArticle } from "../types/news.js";
import { logger } from "../utils/logger.js";
import { parseCurrentsArticles } from "./upstream-validation.js";

const CURRENTS_BASE = "https://api.currentsapi.services/v1";
const PROVIDER_TIMEOUT_MS = 8_000;

async function fetchCurrentsUrl(url: URL): Promise<RawNewsArticle[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });

    if (response.status === 429) {
      logger.warn("Currents rate limited", { status: 429 });
      return [];
    }

    if (!response.ok) {
      logger.warn("Currents API error", { status: response.status });
      return [];
    }

    const data = await response.json();
    return parseCurrentsArticles(data);
  } catch (error) {
    logger.warn("Currents request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFromCurrents(
  countryName: string,
  cca2: string,
): Promise<RawNewsArticle[]> {
  if (!env.currentsApiKey) return [];

  const code = cca2.trim().toUpperCase();

  if (code) {
    const latestUrl = new URL(`${CURRENTS_BASE}/latest-news`);
    latestUrl.searchParams.set("country", code);
    latestUrl.searchParams.set("language", "en");
    latestUrl.searchParams.set("apiKey", env.currentsApiKey);

    const latest = await fetchCurrentsUrl(latestUrl);
    if (latest.length > 0) return latest;
  }

  const searchUrl = new URL(`${CURRENTS_BASE}/search`);
  searchUrl.searchParams.set("keywords", countryName);
  searchUrl.searchParams.set("language", "en");
  if (code) {
    searchUrl.searchParams.set("country", code);
  }
  searchUrl.searchParams.set("apiKey", env.currentsApiKey);

  return fetchCurrentsUrl(searchUrl);
}
