import type { CountryBasic, Country } from "../types/country.js";
import { logger } from "../utils/logger.js";
import {
  CACHE_TTL,
  cacheKeys,
  getOrSet,
} from "./cache.service.js";
import { createStructuredChatCompletion } from "../lib/llm.js";

export type CountryAiContent = NonNullable<Country["ai"]>;

/** Matches max images per country in image.service. */
const AI_FACT_COUNT = 5;

type AiGenerationInput = {
  name: string;
  capital?: string;
  region?: string;
  population?: number;
};

function fallbackAiContent(countryName: string): CountryAiContent {
  const facts = [
    `${countryName} has a unique culture, geography, and history worth exploring.`,
    `${countryName}'s capital and landmarks tell stories that span centuries.`,
    `From local food to festivals, ${countryName} offers discoveries around every corner.`,
    `The landscapes of ${countryName} range from bustling cities to quiet natural wonders.`,
    `Learning about ${countryName} is a quick way to see how diverse our world really is.`,
  ];

  return {
    fact: facts[0],
    facts,
    caption: `Discover ${countryName} in one swipe.`,
    narration: `Welcome to ${countryName}. Let's explore its culture, people, and places together in this quick journey.`,
  };
}

function isValidAiContent(value: unknown): value is CountryAiContent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  const caption =
    typeof candidate.caption === "string" && candidate.caption.trim().length > 0;
  const narration =
    typeof candidate.narration === "string" &&
    candidate.narration.trim().length > 0;

  const facts = candidate.facts;
  const hasFactsArray =
    Array.isArray(facts) &&
    facts.length >= 3 &&
    facts.every((item) => typeof item === "string" && item.trim().length > 0);

  const hasLegacyFact =
    typeof candidate.fact === "string" && candidate.fact.trim().length > 0;

  return caption && narration && (hasFactsArray || hasLegacyFact);
}

function normalizeAiContent(raw: CountryAiContent): CountryAiContent {
  const caption = raw.caption.trim();
  const narration = raw.narration.trim();

  let facts = (raw.facts ?? [])
    .map((item) => item.trim())
    .filter(Boolean);

  if (facts.length === 0 && raw.fact?.trim()) {
    facts = [raw.fact.trim()];
  }

  if (facts.length < AI_FACT_COUNT) {
    for (const extra of [raw.caption, raw.narration]) {
      const line = extra.trim();
      if (line && !facts.includes(line)) facts.push(line);
    }
  }

  const fallback =
    facts[0] ?? "Explore this country to learn something new.";
  while (facts.length < AI_FACT_COUNT) {
    facts.push(facts[facts.length - 1] ?? fallback);
  }

  facts = facts.slice(0, AI_FACT_COUNT);

  return {
    fact: facts[0],
    facts,
    caption,
    narration,
  };
}

function buildPrompt(input: AiGenerationInput): string {
  const populationText =
    typeof input.population === "number"
      ? input.population.toLocaleString()
      : "Unknown";

  return [
    "Generate engaging country content for a swipe-based learning app.",
    "",
    `Country: ${input.name}`,
    `Capital: ${input.capital ?? "Unknown"}`,
    `Region: ${input.region ?? "Unknown"}`,
    `Population: ${populationText}`,
    "",
    "Rules:",
    "- Family friendly tone",
    `- facts: exactly ${AI_FACT_COUNT} distinct surprising one-sentence facts (different topics each)`,
    "- fact: same text as facts[0]",
    "- caption: short 1-2 lines for overlay",
    "- narration: 2-4 spoken-tone sentences",
    "- Return strict JSON only",
    "",
    `JSON shape: {"facts":["...","...","...","...","..."],"fact":"...","caption":"...","narration":"..."}`,
  ].join("\n");
}

async function generateAiFromLlm(
  input: AiGenerationInput,
): Promise<CountryAiContent> {
  const rawJson = await createStructuredChatCompletion([
    {
      role: "system",
      content:
        "You write short, accurate, family-friendly educational country content. Return JSON only.",
    },
    {
      role: "user",
      content: buildPrompt(input),
    },
  ]);

  const parsed = JSON.parse(rawJson) as unknown;
  if (!isValidAiContent(parsed)) {
    logger.warn("Invalid LLM JSON shape, using fallback", {
      country: input.name,
    });
    return fallbackAiContent(input.name);
  }

  const candidate = parsed as CountryAiContent & { facts?: string[] };

  const factsFromLlm = Array.isArray(candidate.facts)
    ? candidate.facts.map((item) => item.trim()).filter(Boolean)
    : [];

  const legacyFact = candidate.fact?.trim() ?? factsFromLlm[0] ?? "";

  return normalizeAiContent({
    fact: legacyFact,
    facts: factsFromLlm.length > 0 ? factsFromLlm : [legacyFact],
    caption: candidate.caption.trim(),
    narration: candidate.narration.trim(),
  });
}

export async function getAiForCountry(
  input: AiGenerationInput,
): Promise<CountryAiContent> {
  const key = cacheKeys.ai(input.name);

  const content = await getOrSet(key, CACHE_TTL.ai, async () => {
    try {
      return await generateAiFromLlm(input);
    } catch (error) {
      logger.warn("AI generation failed, using fallback", {
        country: input.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return fallbackAiContent(input.name);
    }
  });

  return normalizeAiContent(content);
}

export async function enrichCountryWithAi<T extends CountryBasic>(
  country: T,
): Promise<T & { ai: CountryAiContent }> {
  const ai = await getAiForCountry({
    name: country.name,
    capital: country.capital,
    region: country.region,
    population: country.population,
  });

  return {
    ...country,
    ai,
  };
}
