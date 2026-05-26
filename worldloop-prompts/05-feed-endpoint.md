Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 5: Feed Endpoint** for the WorldLoop backend.

## Goal

Power the TikTok-style vertical swipe feed with enriched, paginated country batches.

## Prerequisites (all required)

- `01-country-data-service.md` completed
- **`02-local-redis-setup.md` completed** — Redis running and verified
- `03-image-service.md` and `04-ai-content-service.md` recommended (feed returns full enriched objects when available)

## Scope

- Enhance `GET /feed/countries` with cursor-based pagination:
  - `GET /feed/countries?cursor=<cursor>&limit=<n>` (default `limit=20`, max 30)
- Return fully enriched country objects (metadata + images + ai when services exist)
- Cache feed batches: key `feed:countries:{cursor}`, TTL 7 days
- Cache-first: prefer Redis before recomputing batches
- Response shape includes `data: Country[]` and `nextCursor: string | null`

## Out of scope

- Mobile preload UI (frontend handles prefetch)
- Search / filters (see `06-search-and-explore.md`)

## Acceptance criteria

- First page returns 10–30 countries with `nextCursor` when more exist
- `?cursor=` returns the next batch without duplicates
- Cached batch responds quickly on repeat requests (`Cache hit` in logs)
- Empty cursor starts from the beginning of the feed

## Performance

- Prioritize cached countries when building a batch
- Avoid N+1 AI calls when batch is already cached
