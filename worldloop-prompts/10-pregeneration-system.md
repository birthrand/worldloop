Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 10: Pre-generation System** (optional) for the WorldLoop backend.

## Goal

Precompute AI content and warm caches for popular countries so the first swipe feels instant.

## Prerequisites (all required)

- `04-ai-content-service.md` completed
- **`02-local-redis-setup.md` completed** — Redis running and verified
- `08-redis-caching-layer.md` completed (recommended)

## Scope

- Background job (cron, `node-cron`, or platform scheduler on Render/Railway)
- Configurable list of trending / popular countries (hardcoded array is fine to start)
- For each country: ensure country metadata, images, and AI content exist in cache
- Run daily (or on deploy) — log success/failure per country
- CLI script: `npm run pregenerate` for local/manual runs
- Do not block HTTP requests — runs offline only

## Out of scope

- ML-based trending detection
- User-personalized pre-generation

## Acceptance criteria

- Running the job populates Redis for at least 10 countries without manual API calls
- Re-running the job does not waste AI tokens (respects cache TTL / skip if fresh)
- Failures for one country do not stop the whole job
- README or comment documents how to schedule in production

## Optional stretch

- Refresh stale AI cache entries older than 7 days only
