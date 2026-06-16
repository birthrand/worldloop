import { createStructuredChatCompletion } from "../lib/llm.js";
import type { Country, CountryBasic } from "../types/country.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";

export type CountryAiContent = NonNullable<Country["ai"]>;

/** Matches max images per country in image.service. */
const AI_FACT_COUNT = 5;

export type AiGenerationInput = {
  name: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  landlocked?: boolean;
  languages?: string[];
  timezones?: string[];
  /** Extra disambiguation or geography notes for the LLM prompt. */
  notes?: string;
};

const PLACEHOLDER_AI_PATTERNS = [
  /has a unique culture, geography, and history worth exploring\./,
  /capital and landmarks tell stories that span centuries\./,
  /From local food to festivals, .+ offers discoveries around every corner\./,
  /^Discover .+ in one swipe\.$/,
  /^Welcome to .+\. Let's explore its culture, people, and places together in this quick journey\.$/,
];

function formatPopulation(population: number): string {
  if (population >= 1_000_000_000) {
    return `${(population / 1_000_000_000).toFixed(1)} billion`;
  }
  if (population >= 1_000_000) {
    return `${Math.round(population / 1_000_000)} million`;
  }
  if (population >= 1_000) {
    return `${Math.round(population / 1_000)} thousand`;
  }
  return population.toLocaleString();
}

function formatArea(areaKm2: number): string {
  if (areaKm2 >= 1_000_000) {
    return `${(areaKm2 / 1_000_000).toFixed(1)} million km²`;
  }
  return `${Math.round(areaKm2).toLocaleString()} km²`;
}

function truncateCaption(text: string, maxLength = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Detects catalog placeholder copy from `--skip-ai` builds. */
export function isPlaceholderAiContent(ai: CountryAiContent): boolean {
  return PLACEHOLDER_AI_PATTERNS.some((pattern) =>
    pattern.test(ai.fact.trim()),
  );
}

/** Ensures one carousel fact per image while keeping caption/narration intact. */
export function alignAiFactsToImageCount(
  ai: CountryAiContent,
  imageCount: number,
): CountryAiContent {
  const pool = ai.facts.map((item) => item.trim()).filter(Boolean);
  if (pool.length === 0 && ai.fact.trim()) {
    pool.push(ai.fact.trim());
  }

  const facts: string[] = [];
  for (let index = 0; index < imageCount; index += 1) {
    facts.push(pool[index % pool.length] ?? ai.fact);
  }

  return {
    fact: facts[0] ?? ai.fact,
    facts,
    caption: ai.caption,
    narration: ai.narration,
  };
}

export function fallbackAiContent(input: AiGenerationInput): CountryAiContent {
  const name = input.name.trim();
  const capital = input.capital?.trim() || "its capital";
  const region = input.region?.trim() || "its region";
  const subregion = input.subregion?.trim();
  const regionLabel = subregion ?? region;
  const primaryLanguage = input.languages?.find((item) => item.trim())?.trim();

  const facts: string[] = [
    `${name}'s capital, ${capital}, anchors daily life in ${regionLabel}.`,
  ];

  if (typeof input.population === "number" && input.population > 0) {
    facts.push(
      `About ${formatPopulation(input.population)} people call ${name} home across ${region}.`,
    );
  } else {
    facts.push(
      `${name} sits in ${region}, where local traditions shape everyday routines.`,
    );
  }

  if (primaryLanguage) {
    const languageLabel =
      (input.languages?.length ?? 0) > 1
        ? `${primaryLanguage} and other languages`
        : primaryLanguage;
    facts.push(
      `${languageLabel} connect communities across ${name}, from markets to music.`,
    );
  } else if (input.landlocked === true) {
    facts.push(
      `As a landlocked country, ${name} links cultures through overland trade and travel routes.`,
    );
  } else if (input.landlocked === false) {
    facts.push(
      `${name}'s coastline adds fishing ports and beach towns to its inland cities.`,
    );
  } else {
    facts.push(
      `Across ${name}, festivals, food, and family gatherings carry deep ${region} roots.`,
    );
  }

  if (typeof input.area === "number" && input.area > 0) {
    const terrainHint =
      input.area > 500_000
        ? "vast deserts, mountains, and plains"
        : input.area < 1_000
          ? "a compact map you can cross in hours"
          : "cities, countryside, and open landscapes";
    facts.push(
      `${name} spans roughly ${formatArea(input.area)}, mixing ${terrainHint}.`,
    );
  } else {
    facts.push(
      `Visitors often notice ${name}'s contrasts — historic quarters beside modern districts.`,
    );
  }

  const timezone = input.timezones?.[0]?.replace("UTC", "UTC ");
  if (timezone) {
    facts.push(
      `${name} runs on ${timezone}, a small detail that ties its day to the world clock.`,
    );
  } else {
    facts.push(
      `Every swipe through ${name} reveals details — flags, flavors, and views found nowhere else.`,
    );
  }

  const caption = truncateCaption(
    subregion
      ? `${capital}, ${subregion} — meet ${name}.`
      : `Meet ${name} — ${region} in one swipe.`,
  );

  const narration = `Welcome to ${name}. From ${capital} to the wider ${regionLabel} region, culture and scenery unfold with every swipe.`;

  return normalizeAiContent({
    fact: facts[0]!,
    facts,
    caption,
    narration,
  });
}

function isValidAiContent(value: unknown): value is CountryAiContent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  const caption =
    typeof candidate.caption === "string" &&
    candidate.caption.trim().length > 0;
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

  let facts = (raw.facts ?? []).map((item) => item.trim()).filter(Boolean);

  if (facts.length === 0 && raw.fact?.trim()) {
    facts = [raw.fact.trim()];
  }

  if (facts.length < AI_FACT_COUNT) {
    for (const extra of [raw.caption, raw.narration]) {
      const line = extra.trim();
      if (line && !facts.includes(line)) facts.push(line);
    }
  }

  const fallback = facts[0] ?? "Explore this country to learn something new.";
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

  const notesBlock = input.notes?.trim()
    ? ["", "Additional context:", input.notes.trim()]
    : [];

  return [
    "Generate engaging country content for a swipe-based learning app.",
    "",
    `Country: ${input.name}`,
    `Capital: ${input.capital ?? "Unknown"}`,
    `Region: ${input.region ?? "Unknown"}`,
    `Population: ${populationText}`,
    ...notesBlock,
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
    return fallbackAiContent(input);
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

/** Catalog build script — bypass Redis; optional LLM when configured. */
export async function generateCountryAiUncached(
  input: AiGenerationInput,
): Promise<CountryAiContent> {
  try {
    return await generateAiFromLlm(input);
  } catch (error) {
    logger.warn("AI generation failed, using fallback", {
      country: input.name,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackAiContent(input);
  }
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
      return fallbackAiContent(input);
    }
  });

  return normalizeAiContent(content);
}

function toAiGenerationInput(country: CountryBasic): AiGenerationInput {
  return {
    name: country.name,
    capital: country.capital,
    region: country.region,
    subregion: country.subregion,
    population: country.population,
    area: country.area,
    landlocked: country.landlocked,
    languages: country.languages,
    timezones: country.timezones,
  };
}

export async function enrichCountryWithAi<T extends CountryBasic>(
  country: T,
): Promise<T & { ai: CountryAiContent }> {
  const ai = await getAiForCountry(toAiGenerationInput(country));

  return {
    ...country,
    ai,
  };
}
