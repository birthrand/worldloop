Read AGENTS.md first and follow it strictly.

Reference: `types/country.ts`, `lib/app-region.ts`, `constants/regions.ts`

Build the **full static country catalog** — a committed JSON file the app can load without calling any runtime API.

## Goal

Create `data/countries.json` containing **every discoverable country** (~195 entries) with enough fields to power:

- Explore swipe feed (hero carousel + AI facts)
- Saved countries list
- Search (in-memory over the catalog)
- Map pins and region filters

This is a **one-time generation + commit** workflow. The mobile app reads the file locally at runtime — no REST Countries, Unsplash, or OpenAI calls in production for the explore MVP.

## Why this approach

- Instant feed load — no network waterfall
- No upstream API failures during demos or teaching
- Full control over image order, facts, and feed quality
- Perfect for TikTok-style swipe UX

## Output files

| File                                    | Purpose                                                               |
| --------------------------------------- | --------------------------------------------------------------------- |
| `data/countries.json`                   | Full catalog — **source of truth**                                    |
| `scripts/build-countries-catalog.ts`    | One-time / repeatable generator (Node + TypeScript)                   |
| `scripts/validate-countries-catalog.ts` | Schema + business-rule checks before commit                           |
| `types/country-catalog.ts`              | Optional: `CountryCatalogEntry` type + `StaticCountryCatalog` wrapper |

Do **not** put API keys in the Expo app. Run generation scripts locally or in CI with keys in `backend/.env` only.

## Target schema

Each entry must satisfy the app `Country` type in `types/country.ts`.

### Required fields (every entry)

| Field        | Type               | Rules                                                                                          |
| ------------ | ------------------ | ---------------------------------------------------------------------------------------------- |
| `name`       | `string`           | REST Countries `name.common` — exact match used for routing (`/country/[name]`) and saved list |
| `capital`    | `string`           | First capital; `"—"` only if truly missing (should be rare)                                    |
| `region`     | `string`           | **Normalized app region** — see [Region rules](#region-rules)                                  |
| `population` | `number`           | Positive integer                                                                               |
| `cca2`       | `string`           | ISO 3166-1 alpha-2, lowercase in JSON is OK; normalize to lowercase in script                  |
| `flag`       | `string`           | Always `https://flagcdn.com/w320/{cca2}.png`                                                   |
| `latlng`     | `[number, number]` | `[lat, lng]` from REST Countries                                                               |

### Strongly recommended (profile + filters)

| Field        | Type       | Rules                                                        |
| ------------ | ---------- | ------------------------------------------------------------ |
| `subregion`  | `string`   | UN subregion (e.g. `"Western Europe"`) — keep raw REST value |
| `area`       | `number`   | km²                                                          |
| `landlocked` | `boolean`  |                                                              |
| `timezones`  | `string[]` | e.g. `["UTC+01:00"]`                                         |
| `languages`  | `string[]` | Official language **names** (not ISO codes)                  |

### Explore UX fields (required for MVP quality)

| Field    | Type       | Rules                                                           |
| -------- | ---------- | --------------------------------------------------------------- |
| `images` | `string[]` | **3–5** HTTPS URLs per country; see [Image rules](#image-rules) |
| `ai`     | `object`   | Static copy — see [AI content rules](#ai-content-rules)         |

### Optional (later features)

| Field    | Type             | Notes                                                        |
| -------- | ---------------- | ------------------------------------------------------------ |
| `videos` | `CountryVideo[]` | Omit for explore-only MVP; Culture tab needs direct MP4 URLs |

### Top-level JSON shape

```json
{
  "version": 1,
  "generatedAt": "2026-06-13T00:00:00.000Z",
  "count": 195,
  "countries": []
}
```

### Example entry

```json
{
  "name": "Japan",
  "capital": "Tokyo",
  "region": "Asia",
  "subregion": "Eastern Asia",
  "population": 125836021,
  "cca2": "jp",
  "flag": "https://flagcdn.com/w320/jp.png",
  "latlng": [36.2048, 138.2529],
  "area": 377930,
  "landlocked": false,
  "timezones": ["UTC+09:00"],
  "languages": ["Japanese"],
  "images": [
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80",
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80",
    "https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80"
  ],
  "ai": {
    "fact": "Japan has more than 6,800 islands, though only about 430 are inhabited.",
    "facts": [
      "Japan has more than 6,800 islands, though only about 430 are inhabited.",
      "Tokyo is the world's largest metropolitan area by population.",
      "Japan has over 100 active volcanoes."
    ],
    "caption": "Where ancient temples meet neon cityscapes.",
    "narration": "From snowy Hokkaido to tropical Okinawa, Japan packs incredible variety into a single archipelago."
  }
}
```

---

## Region rules

The app expects **normalized** `region` values compatible with `constants/regions.ts`:

- `Africa`
- `Asia`
- `Europe`
- `Oceania`
- `Antarctic`
- `North America`
- `South America`

Apply the same logic as `normalizeAppRegion()` in `lib/app-region.ts`:

1. REST `Americas` + subregion `South America` → `"South America"`
2. REST `Americas` + subregion `North America`, `Central America`, or `Caribbean` → `"North America"`
3. Ambiguous Americas without subregion → use the South America country name set in `lib/app-region.ts`, else `"North America"`
4. All other REST regions pass through unchanged (`Africa`, `Asia`, `Europe`, `Oceania`, `Antarctic`)

**Keep `subregion` as the raw REST value** even after normalizing `region`.

---

## Image rules

Follow AGENTS.md provider priority when **generating** the catalog (one-time):

1. **Unsplash** (primary)
2. **Pexels** (backup)
3. **Wikipedia** (last resort)

Per country:

- **Minimum 3 URLs**, target **5** (matches backend `MAX_IMAGES = 5`)
- HTTPS only
- Prefer width ≤ 1920 (`w=1200` or `w=1920` query params on Unsplash)
- Travel / landscape / landmark photos — not flags (flags come from `flagcdn.com`)
- No duplicate URLs within a country
- Stable URLs — prefer provider CDN links with explicit width/quality params

Search query pattern (same as backend image service):

```text
{country name} travel landscape
{capital} landmark
{country name} nature city
```

If all providers fail for a country, **block the build** — do not ship entries with empty `images[]` (explore swipe card depends on heroes).

---

## AI content rules

Generate once, store forever in JSON. No runtime OpenAI calls in the app.

Each country needs:

| Key            | Purpose                           | Length                                   |
| -------------- | --------------------------------- | ---------------------------------------- |
| `ai.fact`      | Primary swipe-card fact           | 1–2 sentences, ≤ 160 chars ideal         |
| `ai.facts`     | One fact per carousel slide       | **Same count as `images`** (3–5 strings) |
| `ai.caption`   | Short traveler hook               | ≤ 80 chars                               |
| `ai.narration` | Profile / detail voiceover script | 2–3 sentences                            |

Content rules:

- Factually plausible — no made-up statistics
- No URLs inside AI strings (stripped by `lib/format-country.ts` anyway)
- Engaging, friendly, teaching tone
- `ai.fact` must equal `ai.facts[0]`

Generation options (pick one):

1. **Batch OpenAI** via existing backend AI service (`prompts-worldloop/04-ai-content-service.md`) — export results to JSON
2. **Cursor-assisted** manual pass for top 30, scripted template for the rest
3. **Template fallback** for edge cases only — not for the full catalog

---

## Build pipeline

Implement as a repeatable script, not a manual edit of 195 objects.

### Phase 1 — Fetch metadata

Script: `scripts/build-countries-catalog.ts`

1. Fetch all countries from REST Countries v3.1 (fields-only) or reuse `backend/src/lib/rest-countries.ts`
2. Map each record to `CountryBasic` + normalized `region`
3. Derive `flag` from `cca2` via `https://flagcdn.com/w320/{cca2}.png`
4. Skip non-country entries if any (territories policy: **include all REST sovereign states + commonly listed territories** — document the list in script comments)
5. Sort alphabetically by `name` for stable diffs

### Phase 2 — Enrich images

For each country (batched with concurrency limit, e.g. 3):

1. Call Unsplash → Pexels → Wikipedia (reuse backend `image.service.ts` logic or import shared helpers)
2. Collect 3–5 URLs
3. Write progress to stdout (`[142/195] Japan — 5 images`)

Respect API rate limits — add delay between batches. Cache intermediate results to `scripts/.cache/countries-partial.json` so reruns resume after failure.

### Phase 3 — Enrich AI copy

For each country:

1. Generate `ai` object (batch API or read from partial cache)
2. Ensure `facts.length === images.length`

### Phase 4 — Validate

Run `scripts/validate-countries-catalog.ts`:

- [ ] `countries.length >= 190` (allow small REST drift; fail if `< 180`)
- [ ] Every entry has all required fields
- [ ] Unique `name` and `cca2` (case-insensitive)
- [ ] Valid `latlng` ranges: lat ∈ [-90, 90], lng ∈ [-180, 180]
- [ ] `region` is one of the 7 app continents
- [ ] `images.length` between 3 and 5
- [ ] `ai.facts.length === images.length`
- [ ] All URLs are `https://`
- [ ] No empty strings in `capital`, `ai.fact`, `ai.caption`
- [ ] JSON parses and matches TypeScript `Country` type (use `satisfies` or `zod` in script)

### Phase 5 — Write output

1. Write `data/countries.json` (pretty-printed, 2-space indent)
2. Print summary: count, total JSON size, countries missing optional fields
3. Commit `data/countries.json` — **do not** commit `scripts/.cache/` (add to `.gitignore`)

---

## Script commands

Add to root `package.json`:

```json
{
  "scripts": {
    "catalog:build": "tsx scripts/build-countries-catalog.ts",
    "catalog:validate": "tsx scripts/validate-countries-catalog.ts"
  }
}
```

Prerequisites:

- Node.js 20+
- `tsx` dev dependency (or run via `npx tsx`)
- `backend/.env` with **`REST_COUNTRIES_API_KEY`** (v3.1 is deprecated — use v5)
- `UNSPLASH_ACCESS_KEY` and/or `PEXELS_API_KEY` for image phase (Wikipedia fills gaps)
- Optional: `OPENAI_API_KEY` for AI batch phase (omit `--skip-ai` to use LLM)

Example run:

```bash
npm run catalog:build
npm run catalog:validate
```

---

## Size budget

Approximate expectations:

| Component            | Estimate                     |
| -------------------- | ---------------------------- |
| Metadata per country | ~400 bytes                   |
| 5 image URLs         | ~500 bytes                   |
| AI copy              | ~600 bytes                   |
| **Total**            | ~250–400 KB for full catalog |

This is acceptable for an Expo bundle. Image **bytes** are not bundled — only URL strings.

---

## App integration (follow-up — out of scope for this prompt)

After `data/countries.json` exists, implement in a separate prompt:

1. `lib/static-countries.ts` — load catalog, filter by region, shuffle feed
2. Wire `useCountryFeedStore.loadInitialFeed` to static data
3. Wire search to in-memory filter over catalog
4. Wire map store bootstrap from catalog (or a derived `MapCountry[]`)
5. Keep backend optional for Culture videos / live news only

Do **not** change feed UI in this step — data asset only.

---

## Out of scope

- Runtime API removal from the app (follow-up)
- Bundling images into `assets/` (URLs only)
- Culture `videos[]` for all countries
- Landmarks pipeline (`prompts-worldloop/14-landmarks-data-pipeline.md`)
- Redis / backend feed endpoints

---

## Acceptance criteria

- [ ] `data/countries.json` exists and is committed
- [ ] ≥ 190 countries with complete required + explore fields
- [ ] Every country has 3–5 `images` and matching `ai.facts`
- [ ] All `region` values match app continent ids
- [ ] `npm run catalog:validate` passes with zero errors
- [ ] No secrets or `.env` values inside JSON
- [ ] Generator is rerunnable (cached partials, stable sort)

---

## Test checklist

Manual smoke test after integration (follow-up prompt):

1. Explore tab loads instantly with no loading error
2. Swipe deck shows hero images and rotating facts per carousel index
3. Region filter tabs return correct subsets
4. Search finds countries by name and capital
5. Map shows pins with correct `latlng`
6. Saved tab resolves saved names against catalog
7. Airplane mode — explore feed still works

---

## Usage in Cursor

```text
@prompts/18-static-country-catalog.md implement the catalog build scripts and generate data/countries.json
```

After the JSON exists:

```text
@prompts/18-static-country-catalog.md wire the app to static countries (integration follow-up)
```

---

## Related prompts

| Prompt                                         | Relationship                                    |
| ---------------------------------------------- | ----------------------------------------------- |
| `prompts-worldloop/01-country-data-service.md` | Metadata field mapping reference                |
| `prompts-worldloop/03-image-service.md`        | Image provider chain + 1–5 URLs                 |
| `prompts-worldloop/04-ai-content-service.md`   | AI field shapes for batch generation            |
| `prompts/14-client-side-cache.md`              | Becomes optional once catalog is bundled        |
| `prompts/10f-explore-swipe-deck-prefetch.md`   | Hero prefetch still helps for remote image URLs |
