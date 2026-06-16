# Feature 16: Static Landmark Details Catalog

Read `AGENTS.md` first and follow it strictly.

Reference: `prompts-worldloop/14-landmarks-data-pipeline.md`, `prompts-worldloop/04-ai-content-service.md`, `prompts-worldloop/16a-landmark-details-build-script.md`

## Goal

Ship **offline, instant landmark detail enrichment** for the landmark detail modal by pre-generating AI copy at build time into a separate static catalog.

The modal **“Did you know?”** block reads from this catalog. Wikipedia is **not** baked in for facts (runtime Wikipedia may still be used elsewhere later; out of scope for v1).

---

## Why a second file?

| File                         | Responsibility                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `data/country-profiles.json` | Country Wikipedia overview + landmark **list** cards (name, image, type, coords) |
| `data/landmark-details.json` | Per-landmark **detail enrichment** keyed by stable `landmark.id`                 |

Keeps profile bundle lean (~14k lines) while detail AI adds ~3–4k lines for ~1,000 landmarks.

---

## Catalog shape

```json
{
  "version": 1,
  "generatedAt": "2026-06-16T…",
  "count": 1024,
  "entries": {
    "buddhas-of-bamiyan": {
      "countryName": "Afghanistan",
      "cca2": "af",
      "landmarkName": "Buddhas of Bamiyan",
      "ai": {
        "fact": "…",
        "city": "Bamiyan"
      }
    }
  }
}
```

### TypeScript

See `types/landmark-details-catalog.ts`:

- `LandmarkDetailAiContent` — `{ fact: string; city: string | null }`
- `LandmarkDetailEntry` — metadata + `ai`
- `StaticLandmarkDetailsCatalog` — top-level catalog

Keys in `entries` **must** match `CountryLandmark.id` from `country-profiles.json`.

---

## Runtime flow (mobile)

```text
User opens landmark modal
        │
        ▼
getStaticLandmarkDetailById(landmark.id)
        │
        ├─ hit ─► use static ai.fact + ai.city (instant)
        │
        └─ miss ─► optional runtime fetchLandmarkAi fallback (dev / partial builds)
```

City resolution order:

1. `landmark.city` (from Wikidata/OSM in profiles)
2. `staticDetail.ai.city`
3. Text inference from `landmark.description` (no Wikipedia for v1)

Fact resolution order:

1. `staticDetail.ai.fact`
2. Runtime AI fallback when static missing
3. `landmark.description` as last resort (no Wikipedia fact fallback)

---

## Build

Run via `npm run landmark-details:build` — see `16a-landmark-details-build-script.md`.

**Input:** `data/country-profiles.json` (landmark ids + context for LLM)  
**Output:** `data/landmark-details.json`  
**Secrets:** `backend/.env` (OpenAI key, same as country AI)

---

## File layout

```text
types/landmark-details-catalog.ts
data/landmark-details.json
lib/static-landmark-details.ts
scripts/build-landmark-details.ts
scripts/validate-landmark-details.ts
scripts/lib/landmark-details-validation.ts
constants/static-catalog.ts          # STATIC_LANDMARK_DETAILS_CATALOG_ENABLED
components/ai-explorer/landmark-detail-modal.tsx
```

---

## Out of scope (v1)

- Static Wikipedia extracts per landmark
- Client AsyncStorage cache for landmark AI (bundled JSON is enough)
- Changing landmark discovery pipeline (`14`)

---

## Acceptance criteria

- [ ] `landmark-details:build` generates AI for all landmarks in profiles (with `--resume`, `--only`, `--missing`)
- [ ] `landmark-details:validate` passes against profiles catalog
- [ ] Modal shows static AI fact without network when entry exists
- [ ] Partial builds can resume; missing entries fall back gracefully
- [ ] `npm run lint` and `npm run typecheck` pass
