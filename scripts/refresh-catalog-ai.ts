/**
 * Refreshes AI copy in `data/countries.json` without re-fetching images or metadata.
 *
 * Usage:
 *   npm run catalog:refresh-ai              # replace placeholder copy only
 *   npm run catalog:refresh-ai -- --all     # regenerate every country
 *   npm run catalog:refresh-ai -- --only "Cabo Verde,Congo,DRC"
 *   npm run catalog:refresh-ai -- --skip-ai # metadata fallback only (no OpenAI)
 */
import { config as loadEnv } from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  alignAiFactsToImageCount,
  fallbackAiContent,
  generateCountryAiUncached,
  isPlaceholderAiContent,
  type AiGenerationInput,
} from "../backend/src/services/ai.service.js";
import {
  type CountryCatalogEntry,
  type StaticCountryCatalog,
} from "../types/country-catalog.js";
import { assertValidStaticCountryCatalog } from "./lib/catalog-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "data", "countries.json");

loadEnv({ path: path.join(ROOT, ".env") });
loadEnv({ path: path.join(ROOT, "backend", ".env") });

/** Disambiguation notes for catalog names that confuse the LLM or Redis keys. */
const COUNTRY_AI_NOTES: Record<string, string> = {
  "Cabo Verde":
    "Official name: Republic of Cabo Verde. Island nation in the Atlantic Ocean off West Africa (no mainland border).",
  Congo:
    "Official name: Republic of the Congo. Capital: Brazzaville. Central Africa. Often called Congo-Brazzaville — not the Democratic Republic of the Congo.",
  DRC: "Official name: Democratic Republic of the Congo. Capital: Kinshasa. Very large country in Central Africa. Often called Congo-Kinshasa — not Republic of the Congo (Brazzaville).",
};

type CliOptions = {
  all: boolean;
  skipAi: boolean;
  only: Set<string> | null;
};

function parseArgs(argv: string[]): CliOptions {
  const onlyFlagIndex = argv.indexOf("--only");
  const onlyRaw =
    onlyFlagIndex >= 0 ? (argv[onlyFlagIndex + 1]?.trim() ?? "") : "";
  const onlyNames = onlyRaw
    ? onlyRaw
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  return {
    all: argv.includes("--all"),
    skipAi: argv.includes("--skip-ai"),
    only: onlyNames.length > 0 ? new Set(onlyNames) : null,
  };
}

function toAiGenerationInput(country: CountryCatalogEntry): AiGenerationInput {
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
    notes: COUNTRY_AI_NOTES[country.name],
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const raw = await readFile(OUTPUT_PATH, "utf8");
  const catalog = JSON.parse(raw) as StaticCountryCatalog;

  let refreshed = 0;

  for (const country of catalog.countries) {
    if (options.only && !options.only.has(country.name)) {
      continue;
    }

    const shouldRefresh =
      options.all ||
      options.only !== null ||
      isPlaceholderAiContent(country.ai) ||
      !country.ai.fact?.trim() ||
      country.ai.facts.length !== country.images.length;

    if (!shouldRefresh) continue;

    const aiInput = toAiGenerationInput(country);
    const generated = options.skipAi
      ? fallbackAiContent(aiInput)
      : await generateCountryAiUncached(aiInput);

    country.ai = alignAiFactsToImageCount(generated, country.images.length);
    refreshed += 1;
    console.log(`[ai] ${country.name}`);
  }

  if (refreshed === 0) {
    console.log("[ai] nothing to refresh");
    return;
  }

  catalog.generatedAt = new Date().toISOString();
  assertValidStaticCountryCatalog(catalog);

  await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

  console.log("");
  console.log(`Refreshed AI copy for ${refreshed} countries.`);
  console.log(`  output: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
