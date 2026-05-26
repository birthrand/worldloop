import {
  normalizeImageUrls,
  stripUrlsFromText,
} from "@/lib/normalize-image-url";

/** Compact population label (e.g. 33.7M). */
export function formatPopulation(population: number): string {
  if (population >= 1_000_000_000) {
    return `${(population / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (population >= 1_000_000) {
    return `${(population / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (population >= 1_000) {
    return `${(population / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return population.toLocaleString();
}

export function getCountryImages(country: {
  images?: string[];
}): string[] {
  if (!country.images?.length) return [];
  return normalizeImageUrls(country.images);
}

function cleanAiLine(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  return stripUrlsFromText(raw.trim());
}

export function getAiFact(country: { ai?: { fact?: string } }): string {
  const text = cleanAiLine(country.ai?.fact);
  return text || "Fun fact loading…";
}

/** Fact for carousel slot `index` (cycles when fewer facts than images). */
export function getAiFactByIndex(
  country: {
    ai?: {
      fact?: string;
      facts?: string[];
      caption?: string;
      narration?: string;
    };
  },
  index: number,
): string {
  const facts = country.ai?.facts
    ?.map((item) => cleanAiLine(item))
    .filter(Boolean);

  if (facts?.length) {
    return facts[index % facts.length] ?? getAiFact(country);
  }

  const pool = [
    cleanAiLine(country.ai?.fact),
    cleanAiLine(country.ai?.caption),
    cleanAiLine(country.ai?.narration),
  ].filter(Boolean);

  if (pool.length === 0) return "Fun fact loading…";
  return pool[index % pool.length];
}

export function getDidYouKnowText(country: {
  ai?: { caption?: string; fact?: string };
}): string {
  const caption = country.ai?.caption?.trim();
  if (caption) {
    const text = stripUrlsFromText(caption);
    if (text) return text;
  }
  const fact = country.ai?.fact?.trim();
  if (fact) {
    const text = stripUrlsFromText(fact);
    if (text) return text;
  }
  return "Discover something new about this country as you explore.";
}
