/**
 * Copies cached AI facts from Redis into `data/countries.json` (ai block only).
 *
 * Usage:
 *   npm run catalog:sync-ai-redis
 *
 * Requires Redis running (see backend/.env REDIS_URL). Countries with no cache
 * entry are left unchanged — run `catalog:refresh-ai` later for the rest.
 */
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  alignAiFactsToImageCount,
  isPlaceholderAiContent,
  type CountryAiContent,
} from "../backend/src/services/ai.service.js";
import {
  cacheGet,
  cacheKeys,
  connectCache,
  disconnectCache,
} from "../backend/src/services/cache.service.js";
import type { StaticCountryCatalog } from "../types/country-catalog.js";
import { assertValidStaticCountryCatalog } from "./lib/catalog-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "data", "countries.json");
const CACHE_DIR = path.join(__dirname, ".cache");
const MISSES_PATH = path.join(CACHE_DIR, "ai-redis-misses.json");

const SAVE_EVERY = 25;

loadEnv({ path: path.join(ROOT, ".env") });
loadEnv({ path: path.join(ROOT, "backend", ".env") });

async function writeCatalog(catalog: StaticCountryCatalog): Promise<void> {
  assertValidStaticCountryCatalog(catalog);
  await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
}

async function main(): Promise<void> {
  const raw = await readFile(OUTPUT_PATH, "utf8");
  const catalog = JSON.parse(raw) as StaticCountryCatalog;

  await connectCache();

  let synced = 0;
  let cacheMiss = 0;
  let placeholderSkipped = 0;
  const misses: string[] = [];

  try {
    for (let index = 0; index < catalog.countries.length; index += 1) {
      const country = catalog.countries[index]!;
      const cached = await cacheGet<CountryAiContent>(
        cacheKeys.ai(country.name),
      );

      if (!cached) {
        cacheMiss += 1;
        misses.push(country.name);
        continue;
      }

      if (isPlaceholderAiContent(cached)) {
        placeholderSkipped += 1;
        misses.push(country.name);
        continue;
      }

      country.ai = alignAiFactsToImageCount(cached, country.images.length);
      synced += 1;
      console.log(`[redis] ${country.name}`);

      if (synced > 0 && synced % SAVE_EVERY === 0) {
        catalog.generatedAt = new Date().toISOString();
        await writeCatalog(catalog);
        console.log(`[save] checkpoint after ${synced} synced countries`);
      }
    }
  } finally {
    await disconnectCache();
  }

  if (synced === 0) {
    console.log("");
    console.log("No Redis AI entries were copied into the catalog.");
    console.log(`  cache miss:        ${cacheMiss}`);
    console.log(`  placeholder skip:  ${placeholderSkipped}`);
    console.log("");
    console.log(
      "Start Redis and browse countries via the backend to populate cache,",
    );
    console.log("or run: npm run catalog:refresh-ai -- --all");
  } else {
    catalog.generatedAt = new Date().toISOString();
    await writeCatalog(catalog);
    console.log("");
    console.log(`Synced AI from Redis for ${synced} countries.`);
    console.log(`  output:            ${OUTPUT_PATH}`);
  }

  console.log(`  cache miss:        ${cacheMiss}`);
  console.log(`  placeholder skip:  ${placeholderSkipped}`);
  console.log(`  unchanged:         ${catalog.countries.length - synced}`);

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    MISSES_PATH,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), countries: misses }, null, 2)}\n`,
  );
  console.log(`  misses list:       ${MISSES_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
