Read AGENTS.md first and follow it strictly.

Reference: `prompts/18-static-country-catalog.md`, `prompts/17-culture-video-feed.md`, `prompts/21-explore-culture-hero-toggle.md`, `scripts/sync-catalog-ai-from-redis.ts`, `backend/src/services/video.service.ts`, `backend/src/services/cache.service.ts`, `types/country.ts`, `lib/static-countries.ts`, `lib/format-country.ts`

Build **static culture videos** — commit direct MP4 URLs from Redis into `data/countries.json` so the Culture tab and Explore culture hero toggle work offline without calling `GET /feed/culture/countries`.

## Goal

Copy warmed `videos:{country}` Redis entries into the existing static catalog (`data/countries.json`) as a `videos[]` field on each country row.

After integration, the mobile app should:

- Load Culture feed from bundled JSON (filter `hasCultureVideo`)
- Play Explore in-card culture clips from the same static `videos[0]`
- Never call Pexels, Pixabay, or the culture feed endpoint in production for video URLs

Video **bytes** are not bundled — only HTTPS URL strings (same model as `images[]`).

## Why inline in `countries.json` (not a separate file)

| Concern      | Decision                                                                |
| ------------ | ----------------------------------------------------------------------- |
| Join key     | Same `name` as images, AI, map, saved — no second lookup                |
| Size         | ~1 video per country ≈ 200–350 bytes each → ~50–85 KB for 250 countries |
| Load pattern | Already eager-loaded with explore catalog                               |
| Redis source | `videos:{name}` already keyed by country name                           |

A separate `country-videos.json` is unnecessary unless the catalog grows past ~1 MB.

---

## Current state (baseline)

As of generation:

- Redis: **252** `videos:*` keys, all with Pexels MP4 URLs (0 empty `[]`)
- Catalog: **250** countries in `data/countries.json`, **0** with `videos[]` committed yet
- Culture tab: still network-dependent via `fetchCultureFeedCountries`
- Explore culture hero (`prompts/21-*`): reads `country.videos` when present

---

## Target schema

Reuse `CountryVideo` from `types/country.ts`:

```ts
export type CountryVideo = {
  url: string; // direct HTTPS MP4 — never a watch page
  poster?: string; // still frame; prefer catalog images[0] when missing
  provider?: string; // "pexels" | "pixabay"
  duration?: number; // whole seconds
};
```

### Per-country rules

| Rule              | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| `videos` presence | Optional on catalog type; **required for Culture feed inclusion**     |
| `videos.length`   | **0 or 1** (backend v1 — first clip only)                             |
| `videos[0].url`   | HTTPS, ends with `.mp4` or known CDN path (`videos.pexels.com`, etc.) |
| `poster`          | HTTPS when present; fallback at runtime via `getCulturePosterUri`     |
| `provider`        | Preserve upstream label from Redis (`pexels`, `pixabay`)              |

### Example entry (after sync)

```json
{
  "name": "Japan",
  "capital": "Tokyo",
  "region": "Asia",
  "population": 125836021,
  "cca2": "jp",
  "flag": "https://flagcdn.com/w320/jp.png",
  "latlng": [36.2048, 138.2529],
  "images": ["https://images.unsplash.com/..."],
  "videos": [
    {
      "url": "https://videos.pexels.com/video-files/37505842/15890413_1440_2560_60fps.mp4",
      "provider": "pexels",
      "poster": "https://images.pexels.com/videos/37505842/pexels-photo-37505842.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630",
      "duration": 10
    }
  ],
  "ai": { "fact": "...", "facts": [], "caption": "...", "narration": "..." }
}
```

Do **not** change top-level catalog wrapper (`version`, `generatedAt`, `count`, `countries`).

---

## Redis key contract

From `backend/src/services/cache.service.ts`:

```ts
cacheKeys.videos(name); // → `videos:${name.trim().toLowerCase()}`
```

Cached value: JSON array of `CountryVideo` (0–1 items). TTL: 30 days when hit, 15 minutes for empty negative cache.

**Lookup for sync:** always use `cacheKeys.videos(country.name)` from catalog row — do not guess alternate names (`congo`, `cabo verde` are legacy duplicates; ignore keys not matching catalog names).

---

## Output files

| File                                        | Purpose                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `scripts/sync-catalog-videos-from-redis.ts` | **Primary** — copy Redis → `data/countries.json` |
| `scripts/lib/catalog-validation.ts`         | Extend validation for optional `videos[]` shape  |
| `data/countries.json`                       | Add `videos` field per country (committed)       |

Optional (only if Redis is cold):

| File                              | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `scripts/build-country-videos.ts` | Live fetch via `getVideosForCountry` (rate-limited) |

Do **not** put API keys in the Expo app. Run scripts locally with `backend/.env` only.

---

## Sync script (`scripts/sync-catalog-videos-from-redis.ts`)

Mirror `scripts/sync-catalog-ai-from-redis.ts` exactly in structure.

### Behavior

1. Read `data/countries.json`
2. `connectCache()` using `backend/src/services/cache.service.ts`
3. For each `catalog.countries[i]`:
   - `cacheGet<CountryVideo[]>(cacheKeys.videos(country.name))`
   - **Cache miss** → leave row unchanged; record in misses file
   - **Empty `[]`** → leave unchanged (or set `videos: []` explicitly — prefer omit field)
   - **Non-empty** → assign `country.videos = cached.slice(0, 1)` (enforce max 1)
4. Checkpoint save every 25 synced rows (`generatedAt` bump)
5. `assertValidStaticCountryCatalog(catalog)` before final write
6. Write `scripts/.cache/video-redis-misses.json` with country names still missing

### CLI

```bash
npm run catalog:sync-videos-redis
```

No flags required for v1. Optional later: `--force` (overwrite existing `videos`), `--only Japan,France`.

### Console summary

Print:

- synced count
- cache miss count
- empty-cache count
- output path
- misses list path

---

## Optional live builder (`scripts/build-country-videos.ts`)

Use only when Redis has not been warmed.

1. Read country list from `data/countries.json`
2. For each pending country (no `videos` or `--force`):
   - Call `getVideosForCountry(country.name, country.images)` from `video.service.ts`
   - Writes through to Redis automatically; copy result into catalog row
3. Resume partial cache: `scripts/.cache/country-videos.partial.json`
4. Rate limit: concurrency 1–2, delay 500–800 ms (Pexels video API is slow)

```bash
npm run catalog:build-videos
npm run catalog:build-videos -- --from-redis   # same as sync script
npm run catalog:build-videos -- --only Japan --force
```

Prefer **`catalog:sync-videos-redis`** when Redis already has 250+ hits.

---

## Validation updates (`scripts/lib/catalog-validation.ts`)

Videos are **optional** on the catalog entry type — do not break explore-only rows.

Add checks **when `videos` is present**:

- [ ] `videos` is an array, length 0–1
- [ ] `videos[0].url` is valid HTTPS
- [ ] `videos[0].url` is not a Pexels **page** URL (must be `video-files` / direct MP4)
- [ ] `poster` is HTTPS when present
- [ ] `provider` is `pexels` or `pixabay` when present
- [ ] `duration` is positive integer when present

Add **summary warnings** (not hard fail for v1):

- Warn when `< 90%` of catalog countries have `videos.length >= 1`
- Warn on duplicate `videos[0].url` across countries (rare but possible)

Keep existing image + AI rules unchanged.

---

## Package.json scripts

```json
{
  "scripts": {
    "catalog:sync-videos-redis": "tsx scripts/sync-catalog-videos-from-redis.ts",
    "catalog:build-videos": "tsx scripts/build-country-videos.ts"
  }
}
```

---

## Prerequisites

Warm Redis before sync (fastest path):

```bash
docker compose up -d redis
cd backend && npm run dev
# Exercise culture feed or profile endpoints until videos:* keys populate
curl -s "http://localhost:3001/feed/culture/countries?seed=warm&limit=250"
```

Verify:

```bash
docker compose exec redis redis-cli --scan --pattern "videos:*" | wc -l
# expect ≥ 250
```

Then sync:

```bash
npm run catalog:sync-videos-redis
npm run catalog:validate
```

---

## Size budget

| Component              | Estimate          |
| ---------------------- | ----------------- |
| One `CountryVideo` row | ~250–400 bytes    |
| 250 countries          | ~60–100 KB added  |
| Full `countries.json`  | ~350–500 KB total |

Acceptable for Expo JSON import. MP4 files stream from CDN at runtime.

---

## App integration (follow-up — out of scope for data-only step)

After `videos[]` is committed:

### 1. `lib/static-countries.ts`

Add helpers (videos pass through existing `Country` type — no schema change needed):

```ts
export function getStaticCultureCountries(region?: string | null): Country[];
export function getStaticCultureFeedPage(
  seed: string,
  cursor?: string,
  limit?: number,
): { countries: Country[]; nextCursor: string | null; total: number };
```

Implementation notes:

- Filter `getStaticCountries()` with `hasCultureVideo` from `lib/format-country.ts`
- Reuse `seededShuffle` pattern from backend `culture-feed.service.ts` (port to `lib/culture-shuffle.ts` or inline)
- Region filter via `filterCountriesForExploreRegion`

### 2. `store/use-culture-feed-store.ts`

When `isStaticCountryCatalogEnabled()`:

- `loadInitialFeed` → `getStaticCultureFeedPage(sessionSeed, undefined, limit)`
- `loadMoreFeed` / `extendCultureFeedAtEnd` → static pagination by cursor
- `setRegionFilter` → `getStaticCultureCountries(region)`
- Skip `fetchCultureFeedCountries` unless static catalog disabled

Keep `__DEV__` demo fallback in `getCountryVideos` when static row has no video.

### 3. Explore culture hero (`prompts/21-*`)

No store changes — `ExploreSwipeCard` already reads `country.videos`. Static catalog rows with `videos[]` unlock the toggle automatically.

### 4. `constants/static-catalog.ts`

Optional flag:

```ts
export const STATIC_CULTURE_VIDEOS_ENABLED = true;
```

Gate Culture static path only when catalog rows actually include videos (detect at runtime).

### 5. `lib/api.ts`

`fetchCultureFeedCountries` becomes fallback when static culture is disabled or online refresh is explicitly requested.

---

## Out of scope

- Bundling MP4 files into `assets/` (URLs only)
- Multiple videos per country (v1 = `videos[0]` only)
- Replacing `video.service.ts` or Redis cache on backend
- HLS / adaptive streaming
- Re-fetching videos on every app launch
- Changing Culture overlay UI

---

## Acceptance criteria

- [ ] `prompts/22-static-country-videos.md` exists (this file)
- [ ] `scripts/sync-catalog-videos-from-redis.ts` implemented
- [ ] `npm run catalog:sync-videos-redis` copies Redis URLs into `data/countries.json`
- [ ] ≥ 90% of catalog countries have `videos.length >= 1` after sync
- [ ] `npm run catalog:validate` passes (with new video shape rules)
- [ ] No secrets or `.env` values inside JSON
- [ ] Misses written to `scripts/.cache/video-redis-misses.json` for follow-up
- [ ] Script is rerunnable (checkpoint saves, idempotent on unchanged rows)

---

## Test checklist

After app integration:

1. Airplane mode — Culture tab loads video feed instantly (no loading error)
2. Airplane mode — swipe 10 countries — each autoplays muted loop
3. Airplane mode — Explore culture hero toggle plays same MP4 URL
4. Online — Culture still works with static data (no regression)
5. Country without `videos[]` — excluded from Culture feed, toggle disabled on Explore
6. Video load error — poster fallback (`images[0]` or `flag`)
7. `npm run catalog:validate` passes in CI

**Redis verification before sync:**

```bash
docker compose exec redis redis-cli GET "videos:japan"
```

**Post-sync spot check:**

```bash
node -e "const c=require('./data/countries.json'); const j=c.countries.find(x=>x.name==='Japan'); console.log(j?.videos?.[0]?.url)"
```

---

## Usage in Cursor

Data asset + sync script:

```text
@prompts/22-static-country-videos.md implement sync-catalog-videos-from-redis and populate videos[] in data/countries.json
```

App wiring:

```text
@prompts/22-static-country-videos.md wire static-first Culture feed (useCultureFeedStore + static-countries helpers)
```

---

## Related prompts

| Prompt                                      | Relationship                                      |
| ------------------------------------------- | ------------------------------------------------- |
| `prompts/18-static-country-catalog.md`      | Parent catalog — add `videos[]` alongside images  |
| `prompts/17-culture-video-feed.md`          | Culture tab playback + feed UX                    |
| `prompts/21-explore-culture-hero-toggle.md` | Explore in-card video uses same static `videos[]` |
| `prompts-worldloop/15-video-service.md`     | Backend video fetch + Redis key shape             |
| `scripts/sync-catalog-ai-from-redis.ts`     | Template for Redis → catalog sync script          |
| `prompts/19-static-country-profiles.md`     | Same static-first pattern for detail enrichment   |
