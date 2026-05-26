Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 8: Redis Caching Layer** for the WorldLoop backend.

## Goal

Centralize and harden the cache service so all endpoints share consistent Redis helpers, TTLs, and logging.

## Prerequisites (all required)

- `01-country-data-service.md` completed
- **`02-local-redis-setup.md` completed** — Redis running, `Redis connected` and `Cache hit` verified

Do **not** start this prompt if step `02` has not passed.

## Scope

- Refine `cache.service.ts` wrapping `redis` for Node.js (may already exist from `01`)
- Connect via `REDIS_URL` from env
- Generic helpers: `get`, `set`, `del`, `getOrSet(key, ttl, fetchFn)`
- Standardize cache keys (see `00-backend-overview.md`):
  - `country:{name}`
  - `feed:countries:{cursor}`
  - `ai:{country}`
  - `images:{country}`
  - `map:countries`
  - `search:{query}:{region}`
- TTL constants per data type (AI 7d, images 30d, country 90d, feed 7d)
- Cache hit/miss logged in development
- If Redis becomes unreachable at runtime, log warning and fetch from source (resilience only — **do not** use this to skip step `02`)

## Out of scope

- Installing Redis (done in `02`)
- Redis Cluster / production HA setup (document for later)

## Acceptance criteria

- Redis is running (from `02`) and backend logs `Redis connected` on startup
- Cache hit/miss is logged in development
- All existing services use `cache.service.ts` instead of ad-hoc Redis calls
- TTLs match the overview table
- Manual test: `getOrSet` only calls `fetchFn` once per key within TTL (second request = cache hit)

## Note

If `01` already added a working `cache.service.ts`, refactor and extend it here — keep behavior unchanged when Redis is up.
