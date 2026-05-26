Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 1: Country Data Service** for the WorldLoop backend.

## Goal

Provide country metadata: name, capital, region, population, lat/lng, flag.

## Scope (this step only)

- Create `backend/` project with Node.js + TypeScript + Express or Fastify
- Fetch and normalize data from [REST Countries API](https://restcountries.com/)
- Implement `GET /country/:name` — single country by name (case-insensitive)
- Implement `GET /feed/countries` — list of countries with **basic metadata only** (no images, no AI yet)
- Normalize responses toward the shared `Country` type (partial: omit `images` and `ai` for now)
- Add `cache.service.ts` and wire country/feed routes to use `getOrSet` with keys from `00-backend-overview.md` (connection may fail until prompt `02` installs Redis)

## Next step (required)

Immediately after this prompt, run **`02-local-redis-setup.md`** — Redis must be installed and verified before prompts `03`+.

## Endpoints

```
GET /country/:name
GET /feed/countries
```

## Out of scope

- Installing or starting the Redis **server** (prompt `02`)
- Verifying cache hits (prompt `02`)
- Unsplash / Pexels images
- OpenAI / AI content
- Cursor-based pagination
- Search, map, rate limiting (later prompts)

## Acceptance criteria

- `GET /country/japan` returns valid JSON with name, capital, region, population, flag, latlng
- `GET /feed/countries` returns an array of at least 20 countries with basic fields
- `cache.service.ts` exists and country/feed services use it (hits verified in prompt `02`)
- Errors return clear 404 for unknown countries and 500 with safe messages

## Test

- Call endpoints with curl or Postman
- Confirm mobile app (or a simple fetch script) can consume the feed list
- Cache verification: deferred to `02-local-redis-setup.md`
