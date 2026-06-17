/**
 * Builds `data/landmark-details.json` — static AI enrichment per landmark.
 *
 * Reads landmarks from `data/country-profiles.json`. Secrets stay in `backend/.env`.
 *
 * Usage:
 *   npm run landmark-details:build
 *   npm run landmark-details:build -- --resume
 *   npm run landmark-details:build -- --only Japan,France
 *   npm run landmark-details:build -- --missing
 *   npm run landmark-details:build -- --limit 20
 *   npm run landmark-details:build -- --skip-ai
 *   npm run landmark-details:build -- --from-redis
 */
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  fallbackLandmarkAiContent,
  generateLandmarkAiUncached,
  type LandmarkAiGenerationInput,
} from "../backend/src/services/ai.service.js";
import type { CountryLandmark } from "../backend/src/types/landmarks.js";
import type { StaticCountryProfileCatalog } from "../types/country-profile-catalog.js";
import {
  LANDMARK_DETAILS_CATALOG_VERSION,
  type LandmarkDetailEntry,
  type StaticLandmarkDetailsCatalog,
} from "../types/landmark-details-catalog.js";
import { assertValidStaticLandmarkDetailsCatalog } from "./lib/landmark-details-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(__dirname, ".cache");
const PARTIAL_CACHE_PATH = path.join(
  CACHE_DIR,
  "landmark-details.partial.json",
);
const PROFILES_PATH = path.join(ROOT, "data", "country-profiles.json");
const OUTPUT_PATH = path.join(ROOT, "data", "landmark-details.json");

const LANDMARK_AI_DELAY_MS = 1200;
const SAVE_EVERY = 25;

loadEnv({ path: path.join(ROOT, "backend", ".env") });

type PartialCacheFile = {
  version: 1;
  updatedAt: string;
  entries: Record<string, LandmarkDetailEntry>;
};

type FlatLandmark = {
  id: string;
  countryName: string;
  cca2: string;
  landmark: CountryLandmark;
};

type CliOptions = {
  resume: boolean;
  force: boolean;
  missing: boolean;
  skipAi: boolean;
  fromRedis: boolean;
  limit: number | null;
  only: string[] | null;
};

type BuildServices = {
  cacheGet: <T>(key: string) => Promise<T | null>;
  cacheKeys: {
    landmarkAi: (landmarkName: string, countryName: string) => string;
  };
  connectCache: () => Promise<void>;
  disconnectCache: () => Promise<void>;
};

function parseArgs(argv: string[]): CliOptions {
  const resume = argv.includes("--resume");
  const force = argv.includes("--force");
  const missing = argv.includes("--missing");
  const skipAi = argv.includes("--skip-ai");
  const fromRedis = argv.includes("--from-redis");
  const limitFlagIndex = argv.indexOf("--limit");
  const limit = limitFlagIndex >= 0 ? Number(argv[limitFlagIndex + 1]) : null;
  const onlyFlagIndex = argv.indexOf("--only");
  const onlyRaw = onlyFlagIndex >= 0 ? argv[onlyFlagIndex + 1] : null;
  const only = onlyRaw
    ? onlyRaw
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : null;

  return {
    resume,
    force,
    missing,
    skipAi,
    fromRedis,
    limit:
      Number.isFinite(limit) && (limit as number) > 0
        ? (limit as number)
        : null,
    only,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCca2(cca2: string): string {
  return cca2.trim().toLowerCase();
}

function flattenLandmarks(
  profiles: StaticCountryProfileCatalog,
  only: string[] | null,
): FlatLandmark[] {
  const onlySet = only
    ? new Set(only.map((name) => name.trim().toLowerCase()))
    : null;

  const rows: FlatLandmark[] = [];

  for (const profile of profiles.profiles) {
    const countryKey = profile.name.trim().toLowerCase();
    if (onlySet && !onlySet.has(countryKey)) continue;

    for (const landmark of profile.landmarks ?? []) {
      const id = landmark.id?.trim();
      if (!id) continue;
      rows.push({
        id,
        countryName: profile.name,
        cca2: normalizeCca2(profile.cca2),
        landmark,
      });
    }
  }

  return rows.sort((a, b) => {
    const countryCompare = a.countryName.localeCompare(b.countryName);
    if (countryCompare !== 0) return countryCompare;
    return a.landmark.name.localeCompare(b.landmark.name);
  });
}

function toAiInput(row: FlatLandmark): LandmarkAiGenerationInput {
  return {
    landmarkName: row.landmark.name,
    countryName: row.countryName,
    type: row.landmark.type,
    description: row.landmark.description,
    latitude: row.landmark.latitude,
    longitude: row.landmark.longitude,
    knownCity: row.landmark.city ?? null,
  };
}

function toDetailEntry(
  row: FlatLandmark,
  ai: LandmarkDetailEntry["ai"],
): LandmarkDetailEntry {
  return {
    countryName: row.countryName,
    cca2: row.cca2,
    landmarkName: row.landmark.name,
    ai: {
      fact: ai.fact.trim(),
      city: ai.city?.trim() || null,
    },
  };
}

function hasValidAi(entry: LandmarkDetailEntry | undefined): boolean {
  return Boolean(entry?.ai?.fact?.trim());
}

async function loadServices(): Promise<BuildServices> {
  const cacheModule = await import("../backend/src/services/cache.service.js");
  return {
    cacheGet: cacheModule.cacheGet,
    cacheKeys: cacheModule.cacheKeys,
    connectCache: cacheModule.connectCache,
    disconnectCache: cacheModule.disconnectCache,
  };
}

async function readExistingEntries(): Promise<
  Record<string, LandmarkDetailEntry>
> {
  try {
    const raw = await readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(raw) as StaticLandmarkDetailsCatalog;
    return parsed.entries ?? {};
  } catch {
    return {};
  }
}

async function readPartialCache(): Promise<Record<
  string,
  LandmarkDetailEntry
> | null> {
  try {
    const raw = await readFile(PARTIAL_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as PartialCacheFile;
    if (parsed.version !== 1 || !parsed.entries) return null;
    return parsed.entries;
  } catch {
    return null;
  }
}

async function writePartialCache(
  entries: Record<string, LandmarkDetailEntry>,
): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const payload: PartialCacheFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries,
  };
  await writeFile(PARTIAL_CACHE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

async function resolveLandmarkAi(
  row: FlatLandmark,
  services: BuildServices | null,
  options: CliOptions,
): Promise<LandmarkDetailEntry["ai"]> {
  const input = toAiInput(row);

  if (options.skipAi) {
    return fallbackLandmarkAiContent(input);
  }

  if (options.fromRedis && services) {
    const cached = await services.cacheGet<LandmarkDetailEntry["ai"]>(
      services.cacheKeys.landmarkAi(row.landmark.name, row.countryName),
    );
    if (cached?.fact?.trim()) {
      return {
        fact: cached.fact.trim(),
        city: cached.city?.trim() || null,
      };
    }
  }

  return generateLandmarkAiUncached(input);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const profilesRaw = await readFile(PROFILES_PATH, "utf8");
  const profiles = JSON.parse(profilesRaw) as StaticCountryProfileCatalog;

  let entries = await readExistingEntries();

  if (options.resume && Object.keys(entries).length === 0) {
    const partial = await readPartialCache();
    if (partial) {
      entries = partial;
      console.log(
        `[resume] loaded ${Object.keys(partial).length} entries from partial cache`,
      );
    }
  }

  const services = options.fromRedis ? await loadServices() : null;
  if (services) {
    await services.connectCache();
  }

  try {
    const landmarks = flattenLandmarks(profiles, options.only);
    console.log(`[landmarks] ${landmarks.length} landmarks in scope`);

    let processed = 0;
    let generated = 0;
    let skipped = 0;

    for (const row of landmarks) {
      if (options.limit !== null && processed >= options.limit) break;

      const existing = entries[row.id];
      if (!options.force && hasValidAi(existing)) {
        skipped += 1;
        continue;
      }

      const ai = await resolveLandmarkAi(row, services, options);
      entries[row.id] = toDetailEntry(row, ai);
      generated += 1;
      processed += 1;

      console.log(`[ai] ${row.countryName} — ${row.landmark.name}`);

      if (generated % SAVE_EVERY === 0) {
        await writePartialCache(entries);
        console.log(
          `[cache] saved partial (${Object.keys(entries).length} entries)`,
        );
      }

      if (!options.skipAi) {
        await sleep(LANDMARK_AI_DELAY_MS);
      }
    }

    const catalog: StaticLandmarkDetailsCatalog = {
      version: LANDMARK_DETAILS_CATALOG_VERSION,
      generatedAt: new Date().toISOString(),
      count: Object.keys(entries).length,
      entries,
    };

    assertValidStaticLandmarkDetailsCatalog(catalog, profiles);
    await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

    console.log("");
    console.log(`[done] wrote ${catalog.count} entries → ${OUTPUT_PATH}`);
    console.log(`  generated: ${generated}`);
    console.log(`  skipped:   ${skipped}`);
  } finally {
    if (services) {
      await services.disconnectCache();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
