Read AGENTS.md first and follow it strictly.

Reference: `prompts/18-static-country-catalog.md`, `prompts/16-ai-content-explorer-ui.md`, `prompts-worldloop/14-landmarks-data-pipeline.md`, `types/country.ts`, `lib/api.ts`, `hooks/use-ai-explorer-country.ts`

Build a **static country profile enrichment file** — Wikipedia overview + landmarks — separate from the lean explore catalog in `data/countries.json`.

## Goal

Create `data/country-profiles.json` containing **enrichment data for every catalog country** (~195–250 entries) so the AI Country Explorer detail screen works offline without calling `GET /country/:name/profile`.

The explore feed, search, map, and saved list continue to use `data/countries.json`. Detail-only fields (Wikipedia extract, landmarks) live in this second file.

## Why a separate file

| Concern        | `countries.json`                              | `country-profiles.json`                     |
| -------------- | --------------------------------------------- | ------------------------------------------- |
| Used by        | Explore swipe, search, map, saved             | Country detail screen only                  |
| Size           | ~250–400 KB (metadata + image URLs + AI copy) | Larger (Wikipedia extracts + landmark rows) |
| Load pattern   | Eager — bootstraps feed on app start          | Lazy — load by country name on detail open  |
| Update cadence | Images + AI facts                             | Wikipedia + landmarks pipeline              |

Splitting keeps the feed catalog small and fast while still enabling full offline detail parity.

## Static-first detail behavior

After integration, the detail flow should be:

1. **Instant** — resolve core `Country` from feed cache, `countries.json`, or `getStaticCountryByName`
2. **Instant overview fallback** — show `ai.caption` / `ai.fact` from catalog when Wikipedia is not yet loaded
3. **Bundled enrichment** — hydrate Wikipedia + landmarks from `country-profiles.json` when present
4. **Optional network** — background `prefetchCountryProfile` only when online and static enrichment is missing or stale

Do **not** block the detail screen on network. Do **not** show an overview skeleton when static `ai.caption` is available.

---

## Output files

| File                                   | Purpose                                                               |
| -------------------------------------- | --------------------------------------------------------------------- |
| `data/country-profiles.json`           | Bundled Wikipedia + landmarks — **detail enrichment source of truth** |
| `types/country-profile-catalog.ts`     | `CountryProfileEntry` + `StaticCountryProfileCatalog` types           |
| `lib/static-country-profiles.ts`       | Load catalog, lookup by country name                                  |
| `scripts/build-country-profiles.ts`    | Generator — calls backend profile endpoint or Redis cache             |
| `scripts/validate-country-profiles.ts` | Schema + business-rule checks before commit                           |

Do **not** put API keys in the Expo app. Run generation scripts locally or in CI with `backend/.env` only.

---

## Target schema

Reuse existing mobile types from `lib/api.ts`:

- `CountryWikipediaSummary`
- `CountryLandmark`

### Per-entry shape (`CountryProfileEntry`)

| Field       | Type                              | Rules                                                                                                |
| ----------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `name`      | `string`                          | **Must match** `countries.json` `name` exactly — used for routing (`/country/[name]`) and cache keys |
| `cca2`      | `string`                          | ISO 3166-1 alpha-2; lowercase in JSON is OK; normalize to uppercase in app                           |
| `wikipedia` | `CountryWikipediaSummary \| null` | Prefer non-null with `extract` trimmed; `pageUrl` required when wikipedia is present                 |
| `landmarks` | `CountryLandmark[]`               | **0–5** entries; prefer 3–5 when data exists                                                         |

### Top-level JSON shape

```json
{
  "version": 1,
  "generatedAt": "2026-06-14T00:00:00.000Z",
  "count": 250,
  "profiles": []
}
```

### Example entry

```json
{
  "name": "Japan",
  "cca2": "jp",
  "wikipedia": {
    "title": "Japan",
    "extract": "Japan is an island country in East Asia. Located in the northwest Pacific Ocean, it borders the Sea of Japan to the west and extends from the Sea of Okhotsk in the north to the East China Sea and Taiwan in the south.",
    "description": "Country in East Asia",
    "pageUrl": "https://en.wikipedia.org/wiki/Japan",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Flag_of_Japan.svg/330px-Flag_of_Japan.svg.png"
  },
  "landmarks": [
    {
      "id": "mount-fuji",
      "name": "Mount Fuji",
      "type": "mountain",
      "description": "Japan's highest peak and an iconic symbol of the country.",
      "latitude": 35.3606,
      "longitude": 138.7274,
      "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Mount_Fuji_from_Motosu_2025.jpg/800px-Mount_Fuji_from_Motosu_2025.jpg",
      "source": "wikidata"
    }
  ]
}
```

### Landmark field rules

Align with `backend/src/types/landmarks.ts` and `lib/api.ts`:

| Field                    | Required | Notes                                               |
| ------------------------ | -------- | --------------------------------------------------- |
| `id`                     | yes      | Stable slug; lowercase kebab from name              |
| `name`                   | yes      | Display name                                        |
| `type`                   | yes      | e.g. `monument`, `natural`, `historic`, `religious` |
| `description`            | yes      | 1–2 sentences; first sentence preferred             |
| `latitude` / `longitude` | optional | `null` when unknown                                 |
| `imageUrl`               | optional | HTTPS Wikimedia or null                             |
| `source`                 | yes      | `"wikidata"` \| `"osm"` \| `"wikipedia"`            |

### Wikipedia field rules

| Field          | Required | Notes                                        |
| -------------- | -------- | -------------------------------------------- |
| `title`        | yes      | Wikipedia page title                         |
| `extract`      | yes      | Plain-text overview (REST summary extract)   |
| `description`  | optional | Short subtitle; `null` when missing          |
| `pageUrl`      | yes      | Full `https://en.wikipedia.org/wiki/...` URL |
| `thumbnailUrl` | optional | HTTPS thumb URL or `null`                    |

### Partial entries (allowed)

A profile may have:

- `wikipedia` only (landmarks `[]`)
- `landmarks` only (`wikipedia: null`)
- both
- neither — omit from committed JSON or include with empty/null fields only during generation; **validation should warn** but not fail if at least one enrichment field is present across the full file

Every committed country should have **at least one** of: non-empty `wikipedia.extract`, or `landmarks.length >= 1`.

---

## Join key with `countries.json`

- Primary lookup: `name` (case-insensitive trim)
- Secondary validation: `cca2` must match the catalog row for the same `name`
- Generator should read `data/countries.json` as the country list — do not invent names

```ts
// Validation pseudocode
for (const profile of profiles) {
  const catalog = getCatalogCountryByName(profile.name);
  assert(catalog, `Unknown country: ${profile.name}`);
  assert(
    catalog.cca2.toLowerCase() === profile.cca2.toLowerCase(),
    `cca2 mismatch for ${profile.name}`,
  );
}
```

---

## Generator design (`scripts/build-country-profiles.ts`)

### Input

- `data/countries.json` — country names + `cca2` list
- Running backend at `API_BASE_URL` (default `http://localhost:3000`) **or** Redis with warmed `wikipedia:*` and `landmarks:v6:*` keys

### Strategy (preferred order)

1. **Redis export** — read cached Wikipedia + landmarks if backend has been exercised
2. **Profile API** — `GET /country/:name/profile` per country (rate-limited, resumable)
3. **Skip unchanged** — write partial cache to `scripts/.cache/country-profiles.partial.json`

### CLI flags (suggested)

```bash
npx tsx scripts/build-country-profiles.ts
npx tsx scripts/build-country-profiles.ts --from-redis
npx tsx scripts/build-country-profiles.ts --only Japan,France,Nigeria
npx tsx scripts/build-country-profiles.ts --resume
```

### Output

1. Write `data/country-profiles.json` (pretty-printed, 2-space indent)
2. Print summary: count, enriched with Wikipedia, enriched with landmarks, missing both
3. Commit `data/country-profiles.json` — **do not** commit `scripts/.cache/` (already gitignored)

---

## Validation (`scripts/validate-country-profiles.ts`)

Checks:

- Top-level `version`, `generatedAt`, `count`, `profiles[]`
- Every `name` exists in `countries.json`
- `cca2` matches catalog row
- Wikipedia object shape when present (`extract` non-empty, `pageUrl` starts with `https://`)
- Landmarks: 0–5 items, required fields, valid `source` enum
- No duplicate `name` keys
- `count === profiles.length`
- Warn when entry has neither Wikipedia nor landmarks

Add to root `package.json`:

```json
{
  "scripts": {
    "profiles:build": "tsx scripts/build-country-profiles.ts",
    "profiles:validate": "tsx scripts/validate-country-profiles.ts"
  }
}
```

---

## Size budget

Approximate expectations:

| Component                                   | Estimate            |
| ------------------------------------------- | ------------------- |
| Wikipedia block per country                 | ~400–1,200 bytes    |
| Landmark row                                | ~250–400 bytes each |
| 250 countries × (1 Wikipedia + 4 landmarks) | ~800 KB – 1.5 MB    |

Acceptable as a lazy-loaded JSON import. Image **bytes** are not bundled — only URL strings.

---

## App integration (follow-up — out of scope for data-only step)

After `data/country-profiles.json` exists:

### 1. `lib/static-country-profiles.ts`

- Import JSON once
- `isStaticCountryProfileCatalogEnabled()`
- `getStaticCountryProfileByName(name)` → `{ wikipedia, landmarks } | null`

### 2. `hooks/use-ai-explorer-country.ts`

- Resolve `country` from static catalog / feed first
- Hydrate `wikipedia` + `landmarks` from `getStaticCountryProfileByName`
- Set `loading: false` when catalog country exists
- Set `refreshing: false` when static profile has overview or landmarks
- Gate `prefetchCountryProfile` behind online check / missing static enrichment

### 3. `lib/prefetch-country-profiles.ts`

- Skip `fetchCountryProfile` when static enrichment is complete
- Treat network fetch as stale-while-revalidate upgrade only

### 4. `lib/country-profile-cache.ts`

- `isCountryProfileEnriched` — true when static profile OR cached Wikipedia/landmarks
- `seedCachedCountryProfile` — merge static profile enrichment when seeding from feed

### 5. `constants/static-catalog.ts`

- Add `STATIC_COUNTRY_PROFILE_CATALOG_ENABLED = true` flag (mirrors feed catalog flag)

### Overview fallback order (unchanged in UI, but loading flags change)

```
wikipedia.extract → ai.caption → ai.fact → generic copy
```

Landmarks section: render only when `landmarks.length > 0` (already true).

---

## Out of scope

- Duplicating `Country` core fields into `country-profiles.json` (stay in `countries.json`)
- Culture `videos[]` or live news
- Bundling landmark image bytes into `assets/`
- Replacing backend landmarks pipeline — backend remains source for regeneration
- Changing explore swipe UI

---

## Acceptance criteria

- [ ] `prompts/19-static-country-profiles.md` exists (this file)
- [ ] `data/country-profiles.json` exists and is committed
- [ ] Every profile `name` matches a row in `data/countries.json`
- [ ] ≥ 90% of catalog countries have `wikipedia.extract` or `landmarks.length >= 1`
- [ ] `npm run profiles:validate` passes with zero errors
- [ ] No secrets or `.env` values inside JSON
- [ ] Generator is rerunnable (partial cache, stable sort by `name`)

---

## Test checklist

After app integration:

1. Airplane mode — open country detail from Explore — hero, overview (AI or Wikipedia), geography visible immediately
2. Airplane mode — landmarks section visible for countries with static landmark rows
3. Online — detail still opens instantly; optional background refresh does not flash skeleton
4. Saved tab → detail — same static-first behavior
5. Country with Wikipedia only — overview shows extract; landmarks hidden
6. Country with landmarks only — overview falls back to `ai.caption`; landmarks visible
7. `npm run profiles:validate` passes in CI

---

## Usage in Cursor

Data asset + scripts:

```text
@prompts/19-static-country-profiles.md implement the profile build scripts and generate data/country-profiles.json
```

App wiring:

```text
@prompts/19-static-country-profiles.md wire static-first country detail (useAiExplorerCountry + static-country-profiles.ts)
```

---

## Related prompts

| Prompt                                            | Relationship                                              |
| ------------------------------------------------- | --------------------------------------------------------- |
| `prompts/18-static-country-catalog.md`            | Parent catalog — names, images, AI copy                   |
| `prompts/16-ai-content-explorer-ui.md`            | Detail screen UI + fallback order                         |
| `prompts-worldloop/14-landmarks-data-pipeline.md` | Backend landmark shape + ranking rules                    |
| `prompts/14-client-side-cache.md`                 | AsyncStorage profile cache; becomes optional upgrade path |
| `prompts/10f-explore-swipe-deck-prefetch.md`      | Prefetch becomes static-first + optional network          |
