/**
 * Copies cached culture videos from Redis into `data/countries.json` (videos[] only).
 *
 * Usage:
 *   npm run catalog:sync-videos-redis
 *
 * Requires Redis running (see backend/.env REDIS_URL). Countries with no cache
 * entry are left unchanged — see scripts/.cache/video-redis-misses.json.
 */
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  cacheGet,
  cacheKeys,
  connectCache,
  disconnectCache,
} from "../backend/src/services/cache.service.js";
import type { StaticCountryCatalog } from "../types/country-catalog.js";
import type { CountryVideo } from "../types/country.js";
import { assertValidStaticCountryCatalog } from "./lib/catalog-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "data", "countries.json");
const CACHE_DIR = path.join(__dirname, ".cache");
const MISSES_PATH = path.join(CACHE_DIR, "video-redis-misses.json");

const SAVE_EVERY = 25;

loadEnv({ path: path.join(ROOT, ".env") });
loadEnv({ path: path.join(ROOT, "backend", ".env") });

/** Catalog display name → Redis lookup name when backend keys differ. */
const VIDEO_REDIS_ALIASES: Record<string, string> = {
  DRC: "DR Congo",
};

async function fetchCachedVideos(
  countryName: string,
): Promise<CountryVideo[] | null> {
  const primary = await cacheGet<CountryVideo[]>(cacheKeys.videos(countryName));
  if (primary !== null) return primary;

  const alias = VIDEO_REDIS_ALIASES[countryName];
  if (!alias) return null;

  return cacheGet<CountryVideo[]>(cacheKeys.videos(alias));
}

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
  let emptyCache = 0;
  const misses: string[] = [];

  try {
    for (let index = 0; index < catalog.countries.length; index += 1) {
      const country = catalog.countries[index]!;
      const cached = await fetchCachedVideos(country.name);

      if (cached === null) {
        cacheMiss += 1;
        misses.push(country.name);
        continue;
      }

      if (cached.length === 0) {
        emptyCache += 1;
        misses.push(country.name);
        continue;
      }

      country.videos = cached.slice(0, 1);
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
    console.log("No Redis video entries were copied into the catalog.");
    console.log(`  cache miss:   ${cacheMiss}`);
    console.log(`  empty cache:  ${emptyCache}`);
    console.log("");
    console.log(
      "Start Redis and warm videos via the culture feed, then re-run this script.",
    );
    console.log(
      '  curl -s "http://localhost:3001/feed/culture/countries?seed=warm&limit=250"',
    );
  } else {
    catalog.generatedAt = new Date().toISOString();
    await writeCatalog(catalog);
    console.log("");
    console.log(`Synced videos from Redis for ${synced} countries.`);
    console.log(`  output:       ${OUTPUT_PATH}`);
  }

  console.log(`  synced:       ${synced}`);
  console.log(`  cache miss:   ${cacheMiss}`);
  console.log(`  empty cache:  ${emptyCache}`);
  console.log(`  unchanged:    ${catalog.countries.length - synced}`);

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    MISSES_PATH,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), countries: misses }, null, 2)}\n`,
  );
  console.log(`  misses list:  ${MISSES_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
