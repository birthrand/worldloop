import { continentDisplayLabel } from "@/constants/regions";
import type { Country } from "@/types/country";

export type CategoryId =
  | "overview"
  | "culture"
  | "economy"
  | "people"
  | "trending";

export type InsightCategoryId = "economy" | "culture" | "people" | "events";

export type InsightContent = {
  id: InsightCategoryId;
  title: string;
  summary: string;
};

export type TrendingContent = {
  id: string;
  title: string;
  imageIndex: number;
};

export type CountryExplorerContent = {
  regionLabel: string;
  languagesLabel: string;
  heroDescription: string;
  insights: InsightContent[];
  trending: TrendingContent[];
};

const NIGERIA_CONTENT: CountryExplorerContent = {
  regionLabel: "West Africa",
  languagesLabel: "500+",
  heroDescription:
    "Discover real-time insights about Nigeria across economy, culture, people and more.",
  insights: [
    {
      id: "economy",
      title: "Economy",
      summary:
        "Nigeria's economy is projected to grow by 3.2% in 2026, with diversification beyond oil gaining momentum.",
    },
    {
      id: "culture",
      title: "Culture",
      summary:
        "Nollywood continues to inspire the world, while Afrobeats shapes global music culture.",
    },
    {
      id: "people",
      title: "People",
      summary:
        "Nigeria is home to 250+ ethnic groups and one of the world's youngest populations.",
    },
    {
      id: "events",
      title: "Current Events",
      summary:
        "New infrastructure projects and tech startups are transforming cities nationwide.",
    },
  ],
  trending: [
    { id: "t1", title: "Tech startups on the rise", imageIndex: 0 },
    { id: "t2", title: "Sports driving national pride", imageIndex: 1 },
    { id: "t3", title: "Cuisine winning hearts globally", imageIndex: 2 },
    { id: "t4", title: "Tourism spots to explore", imageIndex: 3 },
  ],
};

const GENERIC_INSIGHTS: InsightContent[] = [
  {
    id: "economy",
    title: "Economy",
    summary:
      "Economic indicators show steady growth with emerging sectors driving new opportunities.",
  },
  {
    id: "culture",
    title: "Culture",
    summary:
      "Rich traditions, arts, and cuisine continue to influence regional and global culture.",
  },
  {
    id: "people",
    title: "People",
    summary:
      "A diverse population with vibrant communities shaping the nation's social fabric.",
  },
  {
    id: "events",
    title: "Current Events",
    summary:
      "Infrastructure, innovation, and public initiatives are reshaping daily life.",
  },
];

const GENERIC_TRENDING: TrendingContent[] = [
  { id: "t1", title: "Tech startups on the rise", imageIndex: 0 },
  { id: "t2", title: "Sports driving national pride", imageIndex: 1 },
  { id: "t3", title: "Cuisine winning hearts globally", imageIndex: 2 },
  { id: "t4", title: "Tourism spots to explore", imageIndex: 3 },
];

const CONTENT_BY_COUNTRY: Record<string, CountryExplorerContent> = {
  Nigeria: NIGERIA_CONTENT,
};

export const NIGERIA_FALLBACK_COUNTRY: Country = {
  name: "Nigeria",
  capital: "Abuja",
  region: "Africa",
  population: 227_000_000,
  cca2: "NG",
  flag: "https://flagcdn.com/w320/ng.png",
  latlng: [10, 8],
  subregion: "Western Africa",
  area: 923_768,
  landlocked: false,
  timezones: ["UTC+01:00"],
  languages: ["English", "Hausa", "Igbo", "Yoruba"],
  images: [],
  ai: {
    fact: NIGERIA_CONTENT.insights[0].summary,
    facts: NIGERIA_CONTENT.insights.map((item) => item.summary),
    caption: NIGERIA_CONTENT.heroDescription,
    narration: NIGERIA_CONTENT.heroDescription,
  },
};

function buildGenericContent(country: Country): CountryExplorerContent {
  const name = country.name;
  const caption = country.ai?.caption?.trim();
  const fact = country.ai?.fact?.trim();

  return {
    regionLabel: continentDisplayLabel(country.region),
    languagesLabel: "500+",
    heroDescription:
      caption ??
      fact ??
      `Discover real-time insights about ${name} across economy, culture, people and more.`,
    insights: GENERIC_INSIGHTS.map((item, index) => ({
      ...item,
      summary:
        country.ai?.facts?.[index]?.trim() ??
        item.summary
          .replace("the nation", name)
          .replace("nationwide", `in ${name}`),
    })),
    trending: GENERIC_TRENDING.map((item) => ({
      ...item,
      title: item.title,
    })),
  };
}

export function getExplorerContent(country: Country): CountryExplorerContent {
  const preset = CONTENT_BY_COUNTRY[country.name];
  if (preset) {
    const caption = country.ai?.caption?.trim();
    const fact = country.ai?.fact?.trim();
    return {
      ...preset,
      heroDescription: caption ?? fact ?? preset.heroDescription,
      insights: preset.insights.map((item, index) => ({
        ...item,
        summary: country.ai?.facts?.[index]?.trim() ?? item.summary,
      })),
    };
  }
  return buildGenericContent(country);
}

export const CATEGORY_CHIPS: { id: CategoryId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "culture", label: "Culture" },
  { id: "economy", label: "Economy" },
  { id: "people", label: "People" },
  { id: "trending", label: "Trending" },
];

export function filterInsightsByCategory(
  insights: InsightContent[],
  category: CategoryId,
): InsightContent[] {
  if (category === "overview" || category === "trending") {
    return insights;
  }
  const map: Record<
    Exclude<CategoryId, "overview" | "trending">,
    InsightCategoryId
  > = {
    culture: "culture",
    economy: "economy",
    people: "people",
  };
  return insights.filter((item) => item.id === map[category]);
}
