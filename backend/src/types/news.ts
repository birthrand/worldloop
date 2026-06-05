export type TrendingTopic =
  | "tech"
  | "sports"
  | "food"
  | "tourism"
  | "culture"
  | "economy"
  | "general";

export type RawNewsArticle = {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source?: string;
};

export type CountryExplorerNews = {
  /** Maps to insight card id "events" */
  eventsSummary: string;
  trending: Array<{
    id: string;
    title: string;
    topic: TrendingTopic;
  }>;
  sources?: Array<{ title: string; url: string; publishedAt: string }>;
  updatedAt: string;
};

export type NewsProviderName = "gnews" | "currents" | "fallback";
