# Feature 16a: Landmark Details Build Script

Companion to `16-landmark-details-static-catalog.md`.

## Script

`scripts/build-landmark-details.ts`  
**npm:** `landmark-details:build`

## Usage

```bash
npm run landmark-details:build
npm run landmark-details:build -- --resume
npm run landmark-details:build -- --only Japan,France
npm run landmark-details:build -- --missing
npm run landmark-details:build -- --limit 20
npm run landmark-details:build -- --skip-ai    # metadata fallback only (no OpenAI)
npm run landmark-details:build -- --from-redis # read landmark-ai:* from Redis when present
```

## CLI flags

| Flag           | Purpose                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `--resume`     | Load partial cache from `scripts/.cache/landmark-details.partial.json` |
| `--only A,B`   | Process landmarks belonging to listed countries only                   |
| `--missing`    | Skip landmarks that already have a valid `ai.fact` in output           |
| `--limit N`    | Stop after N landmark enrichments                                      |
| `--skip-ai`    | Use `fallbackLandmarkAiContent` (no LLM calls)                         |
| `--from-redis` | Prefer Redis `landmark-ai:{landmark}:{country}` before LLM             |
| `--force`      | Regenerate even when entry exists                                      |

## Processing flow

```text
Read data/country-profiles.json
        │
        ▼
Flatten landmarks → { id, countryName, cca2, landmark fields }
        │
        ▼
For each landmark (concurrency 1, delay between LLM calls):
        │
        ├─ --from-redis ? cacheGet(landmarkAi key)
        │
        ├─ else generateLandmarkAiUncached(input)
        │
        ▼
Merge into entries[id]
        │
        ▼
Save partial cache every 25 landmarks
        │
        ▼
Write data/landmark-details.json
        │
        ▼
assertValidStaticLandmarkDetailsCatalog()
```

## LLM input

Uses `LandmarkAiGenerationInput` from `backend/src/services/ai.service.ts`:

- `landmarkName`, `countryName`, `type`, `description`
- `latitude`, `longitude`
- `knownCity` from profile landmark `city` when set

## Validation

`scripts/validate-landmark-details.ts`  
**npm:** `landmark-details:validate`

Checks:

- Catalog version and shape
- Every entry has non-empty `ai.fact`
- Every `entries` key matches a landmark `id` in `country-profiles.json`
- Warns when profile landmarks lack detail entries (coverage ratio)

## Rate limiting

- `LANDMARK_AI_DELAY_MS = 1200` between LLM calls (same spirit as profile build)
- `SAVE_EVERY = 25` partial cache writes
- Failures for one landmark log a warning and use fallback content; build continues

## Redis (optional)

When `--from-redis`:

1. Connect via `cache.service.ts`
2. Read `cacheKeys.landmarkAi(landmarkName, countryName)`
3. On miss, call `generateLandmarkAiUncached`

Requires `02-local-redis-setup.md` completed.

## Related exports

Add to `ai.service.ts`:

```ts
export async function generateLandmarkAiUncached(
  input: LandmarkAiGenerationInput,
): Promise<LandmarkAiContent>;
```

Mirrors `generateCountryAiUncached` — bypasses Redis for catalog builds.
