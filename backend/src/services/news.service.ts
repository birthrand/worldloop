import { buildStaticNewsFallback } from "../data/news-fallback.js";
import { fetchCountryNewsArticles } from "../lib/country-news-providers.js";
import { createStructuredChatCompletion } from "../lib/llm.js";
import type {
  CountryExplorerNews,
  RawNewsArticle,
  TrendingTopic,
} from "../types/news.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";

const TRENDING_TOPICS: TrendingTopic[] = [
  "tech",
  "sports",
  "food",
  "tourism",
  "culture",
  "economy",
  "general",
];

type NewsSummarizeInput = {
  name: string;
  capital: string;
  region: string;
  articles: RawNewsArticle[];
};

function truncateTitle(title: string, max = 60): string {
  const trimmed = title.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function buildSources(articles: RawNewsArticle[]) {
  return articles.slice(0, 6).map((article) => ({
    title: article.title,
    url: article.url,
    publishedAt: article.publishedAt,
  }));
}

function buildHeadlineFallback(input: NewsSummarizeInput): CountryExplorerNews {
  const topics: TrendingTopic[] = ["general", "culture", "economy", "tech"];
  const trending = input.articles.slice(0, 4).map((article, index) => ({
    id: `t${index + 1}`,
    title: truncateTitle(article.title),
    topic: topics[index] ?? "general",
  }));

  while (trending.length < 4) {
    const fallback = buildStaticNewsFallback(input.name);
    trending.push(fallback.trending[trending.length]);
  }

  const firstDescription = input.articles[0]?.description?.trim();
  const eventsSummary =
    firstDescription ??
    `Recent headlines highlight active news and developments across ${input.name}.`;

  return {
    eventsSummary,
    trending,
    sources: buildSources(input.articles),
    updatedAt: new Date().toISOString(),
  };
}

function isValidTrendingTopic(value: unknown): value is TrendingTopic {
  return (
    typeof value === "string" && (TRENDING_TOPICS as string[]).includes(value)
  );
}

function isValidExplorerNews(value: unknown): value is CountryExplorerNews {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  const eventsSummary =
    typeof candidate.eventsSummary === "string" &&
    candidate.eventsSummary.trim().length > 0;

  const trending = candidate.trending;
  const hasTrending =
    Array.isArray(trending) &&
    trending.length === 4 &&
    trending.every((item) => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      return (
        typeof row.id === "string" &&
        typeof row.title === "string" &&
        row.title.trim().length > 0 &&
        isValidTrendingTopic(row.topic)
      );
    });

  return Boolean(eventsSummary && hasTrending);
}

function normalizeExplorerNews(
  raw: CountryExplorerNews,
  articles: RawNewsArticle[],
): CountryExplorerNews {
  return {
    eventsSummary: raw.eventsSummary.trim(),
    trending: raw.trending.map((item, index) => ({
      id: item.id.trim() || `t${index + 1}`,
      title: truncateTitle(item.title),
      topic: isValidTrendingTopic(item.topic) ? item.topic : "general",
    })),
    sources: raw.sources ?? buildSources(articles),
    updatedAt: new Date().toISOString(),
  };
}

function buildSummarizePrompt(input: NewsSummarizeInput): string {
  const headlines = input.articles
    .map((article, index) => {
      const parts = [
        `${index + 1}. ${article.title}`,
        article.description ? `   ${article.description}` : null,
        article.source ? `   Source: ${article.source}` : null,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");

  return [
    "Summarize recent news headlines for a family-friendly country explorer app.",
    "",
    `Country: ${input.name}`,
    `Capital: ${input.capital}`,
    `Region: ${input.region}`,
    "",
    "Headlines:",
    headlines,
    "",
    "Rules:",
    "- Family-friendly, educational, neutral tone",
    "- No graphic violence, partisan framing, medical or legal advice",
    "- Base content on supplied headlines; do not invent specific breaking news if headlines are thin",
    "- eventsSummary: 1-2 sentences for a Current Events insight card",
    "- trending: exactly 4 items; title max 60 chars; engaging but neutral",
    "- topic must be one of: tech, sports, food, tourism, culture, economy, general",
    "- Return strict JSON only",
    "",
    'JSON shape: {"eventsSummary":"...","trending":[{"id":"t1","title":"...","topic":"tech"},{"id":"t2","title":"...","topic":"sports"},{"id":"t3","title":"...","topic":"food"},{"id":"t4","title":"...","topic":"tourism"}]}',
  ].join("\n");
}

async function summarizeNewsWithLlm(
  input: NewsSummarizeInput,
): Promise<CountryExplorerNews> {
  const rawJson = await createStructuredChatCompletion([
    {
      role: "system",
      content:
        "You write short, neutral, family-friendly news summaries for a geography learning app. Return JSON only.",
    },
    {
      role: "user",
      content: buildSummarizePrompt(input),
    },
  ]);

  const parsed = JSON.parse(rawJson) as unknown;
  if (!isValidExplorerNews(parsed)) {
    logger.warn("Invalid news LLM JSON shape, using headline fallback", {
      country: input.name,
    });
    return buildHeadlineFallback(input);
  }

  return normalizeExplorerNews(parsed, input.articles);
}

async function buildExplorerNews(
  countryName: string,
  cca2: string,
  context: { capital: string; region: string },
): Promise<CountryExplorerNews> {
  const { articles } = await fetchCountryNewsArticles(countryName, cca2);

  if (articles.length === 0) {
    logger.info("News using static fallback", { country: countryName });
    return buildStaticNewsFallback(countryName);
  }

  const summarizeInput: NewsSummarizeInput = {
    name: countryName,
    capital: context.capital,
    region: context.region,
    articles,
  };

  try {
    return await summarizeNewsWithLlm(summarizeInput);
  } catch (error) {
    logger.warn("News LLM summarization failed, using headline fallback", {
      country: countryName,
      error: error instanceof Error ? error.message : String(error),
    });
    return buildHeadlineFallback(summarizeInput);
  }
}

export async function getNewsForCountry(
  countryName: string,
  cca2: string,
  context: { capital: string; region: string },
): Promise<CountryExplorerNews> {
  const key = cacheKeys.news(countryName);

  return getOrSet(key, CACHE_TTL.news, async () =>
    buildExplorerNews(countryName, cca2, context),
  );
}
