/**
 * Builds `data/countries.json` — static explore catalog (~195 countries).
 *
 * Territories policy: include all REST Countries entries with valid cca2 + latlng
 * (sovereign states and commonly listed territories such as Greenland, Puerto Rico).
 *
 * Loads secrets from `backend/.env` only — never written into JSON output.
 */
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { flagCdnUrlFromIso2 } from "../backend/src/lib/flag-url.js";
import type { CountryBasic } from "../backend/src/types/country.js";
import {
  CATALOG_VERSION,
  MAX_CATALOG_IMAGES,
  MIN_CATALOG_IMAGES,
  type CountryCatalogEntry,
  type StaticCountryCatalog,
} from "../types/country-catalog.js";
import { assertValidStaticCountryCatalog } from "./lib/catalog-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(__dirname, ".cache");
const PARTIAL_CACHE_PATH = path.join(CACHE_DIR, "countries-partial.json");
const OUTPUT_PATH = path.join(ROOT, "data", "countries.json");

loadEnv({ path: path.join(ROOT, "backend", ".env") });

type BackendCatalogServices = {
  fetchAllRestCountries: () => Promise<CountryBasic[]>;
  fetchCountryImageUrlsUncached: (
    countryName: string,
    options?: { displayWidthPx?: number },
  ) => Promise<string[]>;
  generateCountryAiUncached: (input: {
    name: string;
    capital?: string;
    region?: string;
    population?: number;
  }) => Promise<CountryCatalogEntry["ai"]>;
};

async function loadBackendServices(): Promise<BackendCatalogServices> {
  const [restModule, imageModule, aiModule] = await Promise.all([
    import("../backend/src/lib/rest-countries.js"),
    import("../backend/src/services/image.service.js"),
    import("../backend/src/services/ai.service.js"),
  ]);

  return {
    fetchAllRestCountries: restModule.fetchAllRestCountries,
    fetchCountryImageUrlsUncached: imageModule.fetchCountryImageUrlsUncached,
    generateCountryAiUncached: aiModule.generateCountryAiUncached,
  };
}

function toAiGenerationInput(country: CountryCatalogEntry) {
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

const IMAGE_DISPLAY_WIDTH = 1200;
const BATCH_CONCURRENCY = 3;
const BATCH_DELAY_MS = 400;

type PartialCacheFile = {
  version: 1;
  updatedAt: string;
  countries: CountryCatalogEntry[];
};

type CliOptions = {
  force: boolean;
  limit: number | null;
  skipAi: boolean;
  refreshAi: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const force = argv.includes("--force");
  const skipAi = argv.includes("--skip-ai");
  const refreshAi = argv.includes("--refresh-ai");
  const limitFlagIndex = argv.indexOf("--limit");
  const limit = limitFlagIndex >= 0 ? Number(argv[limitFlagIndex + 1]) : null;

  return {
    force,
    skipAi,
    refreshAi,
    limit:
      Number.isFinite(limit) && (limit as number) > 0
        ? (limit as number)
        : null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCapital(raw?: string): string {
  const value = raw?.trim();
  if (!value || value === "N/A") return "—";
  return value;
}

function toCatalogBasic(country: CountryBasic): CountryCatalogEntry {
  const cca2 = country.cca2.trim().toLowerCase();
  return {
    name: country.name,
    capital: normalizeCapital(country.capital),
    region: country.region,
    population: country.population,
    cca2,
    flag: flagCdnUrlFromIso2(cca2),
    latlng: country.latlng,
    subregion: country.subregion,
    area: country.area,
    landlocked: country.landlocked,
    timezones: country.timezones,
    languages: country.languages ?? [],
    images: [],
    ai: {
      fact: "",
      facts: [],
      caption: "",
      narration: "",
    },
  };
}

async function fetchMetadataPhase(
  fetchAllRestCountries: BackendCatalogServices["fetchAllRestCountries"],
): Promise<CountryCatalogEntry[]> {
  const hasRestKey = Boolean(process.env.REST_COUNTRIES_API_KEY?.trim());

  if (!hasRestKey) {
    throw new Error(
      "REST_COUNTRIES_API_KEY is required in backend/.env (v3.1 is deprecated — sign up at https://restcountries.com/sign-up)",
    );
  }

  const basics = (await fetchAllRestCountries()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  if (basics.length === 0) {
    throw new Error("No countries returned from metadata phase");
  }

  console.log(`[metadata] ${basics.length} countries from REST v5 API`);

  return basics.map(toCatalogBasic);
}

async function readPartialCache(): Promise<CountryCatalogEntry[] | null> {
  try {
    const raw = await readFile(PARTIAL_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as PartialCacheFile;
    if (parsed.version !== 1 || !Array.isArray(parsed.countries)) {
      return null;
    }
    return parsed.countries;
  } catch {
    return null;
  }
}

async function writePartialCache(
  countries: CountryCatalogEntry[],
): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const payload: PartialCacheFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    countries,
  };
  await writeFile(PARTIAL_CACHE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function imageQueries(name: string, capital: string): string[] {
  const queries = [
    name,
    `${name} travel landscape`,
    capital !== "—" ? `${capital} landmark` : `${name} landmark`,
    `${name} nature city`,
    `${name} country scenery`,
  ];

  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))];
}

async function fetchImagesForCountry(
  country: CountryCatalogEntry,
  fetchCountryImageUrlsUncached: BackendCatalogServices["fetchCountryImageUrlsUncached"],
): Promise<string[]> {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const query of imageQueries(country.name, country.capital)) {
    const batch = await fetchCountryImageUrlsUncached(query, {
      displayWidthPx: IMAGE_DISPLAY_WIDTH,
    });

    for (const url of batch) {
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
      if (urls.length >= MAX_CATALOG_IMAGES) {
        return urls.slice(0, MAX_CATALOG_IMAGES);
      }
    }
  }

  return urls;
}

function isCountryComplete(country: CountryCatalogEntry): boolean {
  return (
    country.images.length >= MIN_CATALOG_IMAGES &&
    country.ai.facts.length === country.images.length &&
    Boolean(country.ai.fact) &&
    Boolean(country.ai.caption) &&
    Boolean(country.ai.narration)
  );
}

async function needsAiEnrichment(
  country: CountryCatalogEntry,
  refreshAi: boolean,
): Promise<boolean> {
  if (!isCountryComplete(country)) {
    return true;
  }

  if (!refreshAi) {
    return false;
  }

  const { isPlaceholderAiContent } =
    await import("../backend/src/services/ai.service.js");
  return isPlaceholderAiContent(country.ai);
}

async function enrichImagesPhase(
  countries: CountryCatalogEntry[],
  fetchCountryImageUrlsUncached: BackendCatalogServices["fetchCountryImageUrlsUncached"],
): Promise<void> {
  const pending = countries.filter(
    (country) => country.images.length < MIN_CATALOG_IMAGES,
  );

  if (pending.length === 0) {
    console.log("[images] all countries already enriched");
    return;
  }

  console.log(`[images] enriching ${pending.length} countries…`);

  let completed = 0;
  const failures: string[] = [];

  for (let offset = 0; offset < pending.length; offset += BATCH_CONCURRENCY) {
    const batch = pending.slice(offset, offset + BATCH_CONCURRENCY);

    await Promise.all(
      batch.map(async (country) => {
        const images = await fetchImagesForCountry(
          country,
          fetchCountryImageUrlsUncached,
        );
        country.images = images;

        completed += 1;
        const total = countries.length;
        const index = countries.findIndex(
          (entry) => entry.name === country.name,
        );
        console.log(
          `[${index + 1}/${total}] ${country.name} — ${images.length} images`,
        );

        if (images.length < MIN_CATALOG_IMAGES) {
          failures.push(country.name);
        }
      }),
    );

    await writePartialCache(countries);

    if (offset + BATCH_CONCURRENCY < pending.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Image enrichment failed for ${failures.length} countries (need ${MIN_CATALOG_IMAGES}+ images): ${failures.slice(0, 10).join(", ")}${failures.length > 10 ? "…" : ""}`,
    );
  }

  console.log(`[images] done (${completed} processed)`);
}

async function enrichAiPhase(
  countries: CountryCatalogEntry[],
  skipAi: boolean,
  refreshAi: boolean,
  generateCountryAiUncached: BackendCatalogServices["generateCountryAiUncached"],
): Promise<void> {
  const { alignAiFactsToImageCount, fallbackAiContent } =
    await import("../backend/src/services/ai.service.js");

  const pending: CountryCatalogEntry[] = [];
  for (const country of countries) {
    if (await needsAiEnrichment(country, refreshAi)) {
      pending.push(country);
    }
  }

  if (pending.length === 0) {
    console.log("[ai] all countries already enriched");
    return;
  }

  console.log(
    `[ai] enriching ${pending.length} countries${skipAi ? " (metadata fallback)" : ""}…`,
  );

  for (let index = 0; index < pending.length; index += 1) {
    const country = pending[index];
    const imageCount = country.images.length;
    const aiInput = toAiGenerationInput(country);

    const ai = skipAi
      ? alignAiFactsToImageCount(fallbackAiContent(aiInput), imageCount)
      : alignAiFactsToImageCount(
          await generateCountryAiUncached(aiInput),
          imageCount,
        );

    country.ai = ai;

    console.log(
      `[ai ${index + 1}/${pending.length}] ${country.name} — ${country.ai.facts.length} facts`,
    );

    if ((index + 1) % 10 === 0 || index === pending.length - 1) {
      await writePartialCache(countries);
    }

    if (!skipAi && index < pending.length - 1) {
      await sleep(150);
    }
  }

  console.log("[ai] done");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  console.log("Building static country catalog…");

  const backend = await loadBackendServices();

  let countries: CountryCatalogEntry[];

  if (!options.force) {
    const cached = await readPartialCache();
    if (cached && cached.length > 0) {
      countries = cached;
      console.log(
        `[cache] resumed ${countries.length} countries from partial cache`,
      );
    } else {
      countries = await fetchMetadataPhase(backend.fetchAllRestCountries);
      await writePartialCache(countries);
    }
  } else {
    countries = await fetchMetadataPhase(backend.fetchAllRestCountries);
    await writePartialCache(countries);
  }

  if (options.limit != null) {
    countries = countries.slice(0, options.limit);
    console.log(`[limit] processing first ${countries.length} countries only`);
  }

  await enrichImagesPhase(countries, backend.fetchCountryImageUrlsUncached);
  await enrichAiPhase(
    countries,
    options.skipAi,
    options.refreshAi,
    backend.generateCountryAiUncached,
  );

  const catalog: StaticCountryCatalog = {
    version: CATALOG_VERSION,
    generatedAt: new Date().toISOString(),
    count: countries.length,
    countries,
  };

  assertValidStaticCountryCatalog(
    catalog,
    options.limit != null ? { minCountries: catalog.count } : undefined,
  );

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

  const sizeKb = (Buffer.byteLength(JSON.stringify(catalog)) / 1024).toFixed(1);
  console.log("");
  console.log("Catalog build complete.");
  console.log(`  countries: ${catalog.count}`);
  console.log(`  output:    ${OUTPUT_PATH}`);
  console.log(`  size:      ~${sizeKb} KB`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
