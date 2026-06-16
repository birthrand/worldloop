/**
 * Builds `data/country-profiles.json` — static Wikipedia + landmarks enrichment.
 *
 * Before writing, Commons `Special:FilePath` landmark URLs are resolved to direct
 * `upload.wikimedia.org` thumb URLs so app previews skip redirect hops.
 *
 * Reads country names from `data/countries.json`. Secrets stay in `backend/.env`.
 *
 * Usage:
 *   npm run profiles:build
 *   npm run profiles:build -- --from-redis
 *   npm run profiles:build -- --resume
 *   npm run profiles:build -- --only Japan,France
 *   npm run profiles:build -- --missing-overview
 *   npm run profiles:build -- --missing-landmarks
 *   npm run profiles:build -- --limit 10
 */
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CountryLandmark } from "../backend/src/types/landmarks.js";
import type { CountryWikipediaSummary } from "../backend/src/types/wikipedia.js";
import type { StaticCountryCatalog } from "../types/country-catalog.js";
import {
  PROFILE_CATALOG_VERSION,
  type CountryProfileEntry,
  type StaticCountryProfileCatalog,
} from "../types/country-profile-catalog.js";
import { assertValidStaticCountryProfileCatalog } from "./lib/profile-validation.js";
import {
  isCommonsFilePathUrl,
  resolveCommonsFilePathUrls,
} from "./lib/resolve-commons-image-url.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(__dirname, ".cache");
const PARTIAL_CACHE_PATH = path.join(
  CACHE_DIR,
  "country-profiles.partial.json",
);
const COUNTRIES_PATH = path.join(ROOT, "data", "countries.json");
const OUTPUT_PATH = path.join(ROOT, "data", "country-profiles.json");

const BATCH_CONCURRENCY = 1;
const BATCH_DELAY_MS = 800;
const WIKIPEDIA_ONLY_DELAY_MS = 5000;
const LANDMARKS_ONLY_DELAY_MS = 2000;
const SAVE_EVERY = 10;

loadEnv({ path: path.join(ROOT, "backend", ".env") });

type PartialCacheFile = {
  version: 1;
  updatedAt: string;
  profiles: CountryProfileEntry[];
};

type CliOptions = {
  fromRedis: boolean;
  resume: boolean;
  force: boolean;
  missingOverview: boolean;
  missingLandmarks: boolean;
  limit: number | null;
  only: string[] | null;
};

type ProfileServices = {
  getWikipediaForCountry: (
    name: string,
  ) => Promise<CountryWikipediaSummary | null>;
  getLandmarksForCountry: (
    name: string,
    imageFallbacks: string[],
    context: {
      cca2: string;
      countryName: string;
      capital?: string;
      latlng?: [number, number];
      area?: number;
    },
  ) => Promise<CountryLandmark[]>;
  fetchLandmarksForCountry: (
    name: string,
    imageFallbacks: string[],
    context: {
      cca2: string;
      countryName: string;
      capital?: string;
      latlng?: [number, number];
      area?: number;
    },
  ) => Promise<CountryLandmark[]>;
  cacheGet: <T>(key: string) => Promise<T | null>;
  cacheKeys: {
    wikipedia: (name: string) => string;
    landmarks: (cca2: string) => string;
  };
  connectCache: () => Promise<void>;
  disconnectCache: () => Promise<void>;
};

function parseArgs(argv: string[]): CliOptions {
  const fromRedis = argv.includes("--from-redis");
  const resume = argv.includes("--resume");
  const force = argv.includes("--force");
  const missingOverview = argv.includes("--missing-overview");
  const missingLandmarks = argv.includes("--missing-landmarks");
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
    fromRedis,
    resume,
    force,
    missingOverview,
    missingLandmarks,
    limit:
      Number.isFinite(limit) && (limit as number) > 0
        ? (limit as number)
        : null,
    only,
  };
}

function hasWikipediaOverview(entry: CountryProfileEntry | undefined): boolean {
  return Boolean(entry?.wikipedia?.extract?.trim());
}

function hasLandmarks(entry: CountryProfileEntry | undefined): boolean {
  return (entry?.landmarks?.length ?? 0) > 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCca2(cca2: string): string {
  return cca2.trim().toLowerCase();
}

function normalizeHttpsUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }
  return trimmed;
}

function sanitizeLandmarks(landmarks: CountryLandmark[]): CountryLandmark[] {
  return landmarks.map((landmark) => ({
    ...landmark,
    imageUrl: normalizeHttpsUrl(landmark.imageUrl),
  }));
}

function sanitizeWikipedia(
  wikipedia: CountryWikipediaSummary | null,
): CountryWikipediaSummary | null {
  if (!wikipedia?.extract?.trim()) return null;
  return {
    ...wikipedia,
    thumbnailUrl: normalizeHttpsUrl(wikipedia.thumbnailUrl),
  };
}

function toProfileEntry(
  country: StaticCountryCatalog["countries"][number],
  wikipedia: CountryWikipediaSummary | null,
  landmarks: CountryLandmark[],
): CountryProfileEntry {
  return sanitizeProfileEntry({
    name: country.name,
    cca2: normalizeCca2(country.cca2),
    wikipedia: sanitizeWikipedia(wikipedia),
    landmarks: sanitizeLandmarks(landmarks).slice(0, 5),
  });
}

function sanitizeProfileEntry(entry: CountryProfileEntry): CountryProfileEntry {
  return {
    name: entry.name,
    cca2: normalizeCca2(entry.cca2),
    wikipedia: sanitizeWikipedia(entry.wikipedia),
    landmarks: sanitizeLandmarks(entry.landmarks).slice(0, 5),
  };
}

function isProfileComplete(entry: CountryProfileEntry): boolean {
  return Boolean(
    entry.wikipedia?.extract?.trim() || entry.landmarks.length > 0,
  );
}

async function resolveProfileLandmarkImageUrls(
  profiles: CountryProfileEntry[],
): Promise<CountryProfileEntry[]> {
  const pendingUrls = profiles.flatMap((profile) =>
    profile.landmarks
      .map((landmark) => landmark.imageUrl)
      .filter((url): url is string => isCommonsFilePathUrl(url)),
  );

  if (pendingUrls.length === 0) {
    return profiles;
  }

  console.log(
    `[urls] resolving ${pendingUrls.length} Commons Special:FilePath URLs…`,
  );

  const mappings = await resolveCommonsFilePathUrls(pendingUrls);

  let resolved = 0;
  let failed = 0;

  const nextProfiles = profiles.map((profile) => ({
    ...profile,
    landmarks: profile.landmarks.map((landmark) => {
      const imageUrl = landmark.imageUrl;
      if (!imageUrl || !isCommonsFilePathUrl(imageUrl)) return landmark;

      const directUrl = mappings.get(imageUrl) ?? imageUrl;
      if (
        directUrl !== imageUrl &&
        directUrl.includes("upload.wikimedia.org")
      ) {
        resolved += 1;
        return { ...landmark, imageUrl: directUrl };
      }

      failed += 1;
      return landmark;
    }),
  }));

  console.log(
    `[urls] resolved ${resolved} landmark image URLs (${failed} kept as-is)`,
  );

  return nextProfiles;
}

async function loadServices(): Promise<ProfileServices> {
  const [wikipediaModule, landmarksModule, cacheModule] = await Promise.all([
    import("../backend/src/services/wikipedia.service.js"),
    import("../backend/src/services/landmarks.service.js"),
    import("../backend/src/services/cache.service.js"),
  ]);

  return {
    getWikipediaForCountry: wikipediaModule.getWikipediaForCountry,
    getLandmarksForCountry: landmarksModule.getLandmarksForCountry,
    fetchLandmarksForCountry: landmarksModule.fetchLandmarksForCountry,
    cacheGet: cacheModule.cacheGet,
    cacheKeys: cacheModule.cacheKeys,
    connectCache: cacheModule.connectCache,
    disconnectCache: cacheModule.disconnectCache,
  };
}

async function readExistingProfiles(): Promise<CountryProfileEntry[] | null> {
  try {
    const raw = await readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(raw) as StaticCountryProfileCatalog;
    if (!Array.isArray(parsed.profiles)) return null;
    return parsed.profiles.map(sanitizeProfileEntry);
  } catch {
    return null;
  }
}

async function readPartialCache(): Promise<CountryProfileEntry[] | null> {
  try {
    const raw = await readFile(PARTIAL_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as PartialCacheFile;
    if (parsed.version !== 1 || !Array.isArray(parsed.profiles)) {
      return null;
    }
    return parsed.profiles;
  } catch {
    return null;
  }
}

async function writePartialCache(
  profiles: CountryProfileEntry[],
): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const payload: PartialCacheFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    profiles,
  };
  await writeFile(PARTIAL_CACHE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

async function fetchWikipediaOnly(
  country: StaticCountryCatalog["countries"][number],
  services: ProfileServices,
  fromRedis: boolean,
): Promise<CountryWikipediaSummary | null> {
  if (fromRedis) {
    return services.cacheGet<CountryWikipediaSummary>(
      services.cacheKeys.wikipedia(country.name),
    );
  }
  return services.getWikipediaForCountry(country.name);
}

function mergeWikipediaUpdate(
  existing: CountryProfileEntry,
  country: StaticCountryCatalog["countries"][number],
  wikipedia: CountryWikipediaSummary | null,
): CountryProfileEntry {
  return sanitizeProfileEntry({
    name: existing.name || country.name,
    cca2: existing.cca2 || normalizeCca2(country.cca2),
    wikipedia: sanitizeWikipedia(wikipedia) ?? existing.wikipedia,
    landmarks: existing.landmarks,
  });
}

async function fetchLandmarksOnly(
  country: StaticCountryCatalog["countries"][number],
  services: ProfileServices,
  fromRedis: boolean,
  bypassCache = false,
): Promise<CountryLandmark[]> {
  const context = {
    cca2: country.cca2,
    countryName: country.name,
    capital: country.capital,
    latlng: country.latlng,
    area: country.area,
  };

  if (fromRedis) {
    return (
      (await services.cacheGet<CountryLandmark[]>(
        services.cacheKeys.landmarks(country.cca2),
      )) ?? []
    );
  }

  if (bypassCache) {
    return services.fetchLandmarksForCountry(
      country.name,
      country.images ?? [],
      context,
    );
  }

  return services.getLandmarksForCountry(
    country.name,
    country.images ?? [],
    context,
  );
}

function mergeLandmarksUpdate(
  existing: CountryProfileEntry,
  country: StaticCountryCatalog["countries"][number],
  landmarks: CountryLandmark[],
): CountryProfileEntry {
  const sanitized = sanitizeLandmarks(landmarks).slice(0, 5);
  return sanitizeProfileEntry({
    name: existing.name || country.name,
    cca2: existing.cca2 || normalizeCca2(country.cca2),
    wikipedia: existing.wikipedia,
    landmarks: sanitized.length > 0 ? sanitized : existing.landmarks,
  });
}
async function fetchFromRedis(
  country: StaticCountryCatalog["countries"][number],
  services: ProfileServices,
): Promise<CountryProfileEntry> {
  const [wikipedia, landmarks] = await Promise.all([
    services.cacheGet<CountryWikipediaSummary>(
      services.cacheKeys.wikipedia(country.name),
    ),
    services.cacheGet<CountryLandmark[]>(
      services.cacheKeys.landmarks(country.cca2),
    ),
  ]);

  return toProfileEntry(country, wikipedia, landmarks ?? []);
}

async function fetchFromServices(
  country: StaticCountryCatalog["countries"][number],
  services: ProfileServices,
): Promise<CountryProfileEntry> {
  const [wikipedia, landmarks] = await Promise.all([
    services.getWikipediaForCountry(country.name),
    services.getLandmarksForCountry(country.name, country.images ?? [], {
      cca2: country.cca2,
      countryName: country.name,
      capital: country.capital,
      latlng: country.latlng,
      area: country.area,
    }),
  ]);

  return toProfileEntry(country, wikipedia, landmarks);
}

function mergeProfiles(
  existing: CountryProfileEntry[],
  incoming: CountryProfileEntry[],
): CountryProfileEntry[] {
  const byName = new Map(
    existing.map((entry) => [entry.name.trim().toLowerCase(), entry]),
  );

  for (const entry of incoming) {
    byName.set(entry.name.trim().toLowerCase(), entry);
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function selectCountries(
  catalog: StaticCountryCatalog,
  options: CliOptions,
): StaticCountryCatalog["countries"] {
  let countries = [...catalog.countries].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  if (options.only?.length) {
    const wanted = new Set(options.only.map((name) => name.toLowerCase()));
    countries = countries.filter((country) =>
      wanted.has(country.name.toLowerCase()),
    );
  }

  if (options.limit) {
    countries = countries.slice(0, options.limit);
  }

  return countries;
}

async function enrichMissingOverviews(
  pending: StaticCountryCatalog["countries"],
  allCountries: StaticCountryCatalog["countries"],
  services: ProfileServices,
  options: CliOptions,
  existingProfiles: CountryProfileEntry[],
): Promise<CountryProfileEntry[]> {
  const results = new Map(
    existingProfiles.map((entry) => [entry.name.trim().toLowerCase(), entry]),
  );

  for (const country of allCountries) {
    const key = country.name.trim().toLowerCase();
    if (!results.has(key)) {
      results.set(key, toProfileEntry(country, null, []));
    }
  }

  if (pending.length === 0) {
    console.log(
      "[overview] all selected countries already have Wikipedia extract",
    );
    return allCountries.map(
      (country) => results.get(country.name.trim().toLowerCase())!,
    );
  }

  console.log(
    `[overview] fetching Wikipedia for ${pending.length} countries (${options.fromRedis ? "redis" : "live services"})…`,
  );

  let completed = 0;

  for (const country of pending) {
    const key = country.name.trim().toLowerCase();
    const existing = results.get(key) ?? toProfileEntry(country, null, []);

    try {
      const wikipedia = await fetchWikipediaOnly(
        country,
        services,
        options.fromRedis,
      );
      const updated = mergeWikipediaUpdate(existing, country, wikipedia);
      results.set(key, updated);
      completed += 1;

      const wiki = updated.wikipedia?.extract ? "wiki" : "—";
      console.log(
        `[${completed}/${pending.length}] ${country.name} — ${wiki}, ${updated.landmarks.length} landmarks (kept)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[skip] ${country.name} — ${message}`);
      completed += 1;
    }

    const snapshot = allCountries.map(
      (entry) => results.get(entry.name.trim().toLowerCase())!,
    );
    await writePartialCache(snapshot);

    if (completed % SAVE_EVERY === 0) {
      console.log(`[save] partial cache checkpoint (${completed} processed)`);
    }

    if (completed < pending.length) {
      await sleep(WIKIPEDIA_ONLY_DELAY_MS);
    }
  }

  return allCountries.map(
    (country) => results.get(country.name.trim().toLowerCase())!,
  );
}

async function enrichMissingLandmarks(
  pending: StaticCountryCatalog["countries"],
  allCountries: StaticCountryCatalog["countries"],
  services: ProfileServices,
  options: CliOptions,
  existingProfiles: CountryProfileEntry[],
): Promise<CountryProfileEntry[]> {
  const results = new Map(
    existingProfiles.map((entry) => [entry.name.trim().toLowerCase(), entry]),
  );

  for (const country of allCountries) {
    const key = country.name.trim().toLowerCase();
    if (!results.has(key)) {
      results.set(key, toProfileEntry(country, null, []));
    }
  }

  if (pending.length === 0) {
    console.log("[landmarks] all selected countries already have landmarks");
    return allCountries.map(
      (country) => results.get(country.name.trim().toLowerCase())!,
    );
  }

  console.log(
    `[landmarks] fetching landmarks for ${pending.length} countries (${options.fromRedis ? "redis" : "live services"})…`,
  );

  let completed = 0;

  for (const country of pending) {
    const key = country.name.trim().toLowerCase();
    const existing = results.get(key) ?? toProfileEntry(country, null, []);

    try {
      const landmarks = await fetchLandmarksOnly(
        country,
        services,
        options.fromRedis,
        true,
      );
      const updated = mergeLandmarksUpdate(existing, country, landmarks);
      results.set(key, updated);
      completed += 1;

      const wiki = updated.wikipedia?.extract ? "wiki" : "—";
      console.log(
        `[${completed}/${pending.length}] ${country.name} — ${wiki} (kept), ${updated.landmarks.length} landmarks`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[skip] ${country.name} — ${message}`);
      completed += 1;
    }

    const snapshot = allCountries.map(
      (entry) => results.get(entry.name.trim().toLowerCase())!,
    );
    await writePartialCache(snapshot);

    if (completed % SAVE_EVERY === 0) {
      console.log(`[save] partial cache checkpoint (${completed} processed)`);
    }

    if (completed < pending.length) {
      await sleep(LANDMARKS_ONLY_DELAY_MS);
    }
  }

  return allCountries.map(
    (country) => results.get(country.name.trim().toLowerCase())!,
  );
}

async function enrichProfiles(
  countries: StaticCountryCatalog["countries"],
  services: ProfileServices,
  options: CliOptions,
  existingProfiles: CountryProfileEntry[],
): Promise<CountryProfileEntry[]> {
  const existingByName = new Map(
    existingProfiles.map((entry) => [entry.name.trim().toLowerCase(), entry]),
  );

  const pending = countries.filter((country) => {
    if (options.force) return true;
    const cached = existingByName.get(country.name.trim().toLowerCase());
    return !cached || !isProfileComplete(cached);
  });

  if (pending.length === 0) {
    console.log("[profiles] all selected countries already enriched");
    return mergeProfiles(
      existingProfiles,
      countries.map(
        (country) =>
          existingByName.get(country.name.trim().toLowerCase()) ??
          toProfileEntry(country, null, []),
      ),
    );
  }

  console.log(
    `[profiles] enriching ${pending.length} countries (${options.fromRedis ? "redis" : "live services"})…`,
  );

  const results = new Map(
    existingProfiles.map((entry) => [entry.name.trim().toLowerCase(), entry]),
  );

  let completed = 0;

  for (let offset = 0; offset < pending.length; offset += BATCH_CONCURRENCY) {
    const batch = pending.slice(offset, offset + BATCH_CONCURRENCY);

    await Promise.all(
      batch.map(async (country) => {
        try {
          const entry = options.fromRedis
            ? await fetchFromRedis(country, services)
            : await fetchFromServices(country, services);

          results.set(country.name.trim().toLowerCase(), entry);
          completed += 1;

          const wiki = entry.wikipedia?.extract ? "wiki" : "—";
          const landmarks = entry.landmarks.length;
          console.log(
            `[${completed}/${pending.length}] ${country.name} — ${wiki}, ${landmarks} landmarks`,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(`[skip] ${country.name} — ${message}`);
          results.set(
            country.name.trim().toLowerCase(),
            toProfileEntry(country, null, []),
          );
          completed += 1;
        }
      }),
    );

    const merged = countries.map((country) => {
      const key = country.name.trim().toLowerCase();
      return (
        results.get(key) ??
        existingByName.get(key) ??
        toProfileEntry(country, null, [])
      );
    });

    await writePartialCache(merged);

    if (completed % SAVE_EVERY === 0) {
      console.log(`[save] partial cache checkpoint (${completed} processed)`);
    }

    if (offset + BATCH_CONCURRENCY < pending.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return countries.map((country) => {
    const key = country.name.trim().toLowerCase();
    return (
      results.get(key) ??
      existingByName.get(key) ??
      toProfileEntry(country, null, [])
    );
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const countriesRaw = await readFile(COUNTRIES_PATH, "utf8");
  const countriesCatalog = JSON.parse(countriesRaw) as StaticCountryCatalog;
  const allCountries = [...countriesCatalog.countries].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  let existingProfiles = (await readExistingProfiles()) ?? [];

  if (options.resume && existingProfiles.length === 0) {
    const partial = await readPartialCache();
    if (partial) {
      existingProfiles = partial.map(sanitizeProfileEntry);
      console.log(
        `[resume] loaded ${partial.length} profiles from partial cache`,
      );
    }
  }

  let countriesToProcess = selectCountries(countriesCatalog, options);

  if (options.missingOverview) {
    const existingByName = new Map(
      existingProfiles.map((entry) => [entry.name.trim().toLowerCase(), entry]),
    );
    countriesToProcess = countriesToProcess.filter(
      (country) =>
        !hasWikipediaOverview(
          existingByName.get(country.name.trim().toLowerCase()),
        ),
    );
    console.log(
      `[overview] ${countriesToProcess.length} countries missing Wikipedia extract`,
    );
  }

  if (options.missingLandmarks) {
    const existingByName = new Map(
      existingProfiles.map((entry) => [entry.name.trim().toLowerCase(), entry]),
    );
    countriesToProcess = countriesToProcess.filter(
      (country) =>
        !hasLandmarks(existingByName.get(country.name.trim().toLowerCase())),
    );
    console.log(
      `[landmarks] ${countriesToProcess.length} countries missing landmarks`,
    );
  }

  if (options.missingOverview && options.missingLandmarks) {
    throw new Error("Use --missing-overview or --missing-landmarks, not both");
  }

  if (countriesToProcess.length === 0) {
    if (
      (options.missingOverview || options.missingLandmarks) &&
      existingProfiles.length > 0
    ) {
      const label = options.missingOverview ? "overview" : "landmarks";
      console.log(`[${label}] nothing to update — writing existing catalog`);
      const resolvedProfiles = await resolveProfileLandmarkImageUrls(
        existingProfiles.map(sanitizeProfileEntry),
      );
      const catalog: StaticCountryProfileCatalog = {
        version: PROFILE_CATALOG_VERSION,
        generatedAt: new Date().toISOString(),
        count: resolvedProfiles.length,
        profiles: resolvedProfiles,
      };
      assertValidStaticCountryProfileCatalog(catalog, countriesCatalog);
      await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
      return;
    }
    throw new Error("No countries selected — check --only / --limit flags");
  }

  const services = await loadServices();
  await services.connectCache();

  try {
    const profiles = options.missingOverview
      ? await enrichMissingOverviews(
          countriesToProcess,
          allCountries,
          services,
          options,
          existingProfiles,
        )
      : options.missingLandmarks
        ? await enrichMissingLandmarks(
            countriesToProcess,
            allCountries,
            services,
            options,
            existingProfiles,
          )
        : await enrichProfiles(
            countriesToProcess,
            services,
            options,
            existingProfiles,
          );

    const resolvedProfiles = await resolveProfileLandmarkImageUrls(
      profiles.map(sanitizeProfileEntry),
    );

    const catalog: StaticCountryProfileCatalog = {
      version: PROFILE_CATALOG_VERSION,
      generatedAt: new Date().toISOString(),
      count: resolvedProfiles.length,
      profiles: resolvedProfiles,
    };

    assertValidStaticCountryProfileCatalog(catalog, countriesCatalog);

    await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

    const enriched = profiles.filter(isProfileComplete).length;
    const withWikipedia = profiles.filter((entry) =>
      entry.wikipedia?.extract?.trim(),
    ).length;
    const withLandmarks = profiles.filter(
      (entry) => entry.landmarks.length > 0,
    ).length;
    const sizeKb = (Buffer.byteLength(JSON.stringify(catalog)) / 1024).toFixed(
      1,
    );

    console.log("");
    console.log("Country profiles catalog written.");
    console.log(`  output:      ${OUTPUT_PATH}`);
    console.log(`  profiles:    ${catalog.count}`);
    console.log(
      `  enriched:    ${enriched} (${((enriched / catalog.count) * 100).toFixed(1)}%)`,
    );
    console.log(`  wikipedia:   ${withWikipedia}`);
    console.log(`  landmarks:   ${withLandmarks}`);
    console.log(`  size:        ~${sizeKb} KB`);
  } finally {
    await services.disconnectCache();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
