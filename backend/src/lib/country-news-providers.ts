import type { NewsProviderName, RawNewsArticle } from "../types/news.js";
import { logger } from "../utils/logger.js";
import { fetchFromCurrents } from "./currents.js";
import { fetchFromGNews } from "./gnews.js";

export type CountryNewsFetchResult = {
  articles: RawNewsArticle[];
  provider: NewsProviderName;
};

export async function fetchCountryNewsArticles(
  countryName: string,
  cca2: string,
): Promise<CountryNewsFetchResult> {
  const gnewsArticles = await fetchFromGNews(countryName, cca2);
  if (gnewsArticles.length > 0) {
    logger.info("News fetched", {
      country: countryName,
      provider: "gnews",
      count: gnewsArticles.length,
    });
    return { articles: gnewsArticles, provider: "gnews" };
  }

  const currentsArticles = await fetchFromCurrents(countryName, cca2);
  if (currentsArticles.length > 0) {
    logger.info("News fetched", {
      country: countryName,
      provider: "currents",
      count: currentsArticles.length,
    });
    return { articles: currentsArticles, provider: "currents" };
  }

  logger.warn("News providers returned no articles", { country: countryName });
  return { articles: [], provider: "fallback" };
}
