Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 3: Image Service** for the WorldLoop backend.

## Goal

Provide 1–5 high-quality image URLs per country from Unsplash (primary) or Pexels (backup).

## Prerequisites (all required)

- `01-country-data-service.md` completed
- **`02-local-redis-setup.md` completed** — Redis running and verified

## Scope

- Create `image.service.ts` — fetch images by country name
- Cache image URL arrays in Redis: key `images:{country}`, TTL 30 days
- Merge `images: string[]` into country objects before returning to clients
- Integrate into `GET /country/:name` and `GET /feed/countries`
- Fallback: empty array or 1–2 static placeholder URLs when APIs fail (document in code)

## Out of scope

- AI content generation
- Image hosting / CDN upload (URLs only)
- Frontend image caching (mobile handles that separately per AGENTS.md)

## Acceptance criteria

- Country responses include `images` with 1–5 URLs when APIs succeed
- Failed image fetch does not break the country endpoint (graceful fallback)
- Image results are cached in Redis and reused on second request (`Cache hit` in logs)
- No Unsplash/Pexels API keys in the Expo app

## Env vars

- `UNSPLASH_ACCESS_KEY` and/or `PEXELS_API_KEY` in backend `.env` only
