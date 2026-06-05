import type { CountryExplorerNews } from "../types/news.js";

const TRENDING_TOPICS = [
  { id: "t1", title: "Tech startups on the rise", topic: "tech" as const },
  {
    id: "t2",
    title: "Sports driving national pride",
    topic: "sports" as const,
  },
  {
    id: "t3",
    title: "Cuisine winning hearts globally",
    topic: "food" as const,
  },
  {
    id: "t4",
    title: "Tourism spots to explore",
    topic: "tourism" as const,
  },
];

export function buildStaticNewsFallback(
  countryName: string,
): CountryExplorerNews {
  return {
    eventsSummary: `Infrastructure, innovation, and public initiatives are reshaping daily life in ${countryName}.`,
    trending: TRENDING_TOPICS.map((item) => ({
      ...item,
      title: item.title,
    })),
    updatedAt: new Date().toISOString(),
  };
}
