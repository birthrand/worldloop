Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 3: Image Service** for the WorldLoop backend.

## Goal

Provide 1–5 high-quality image URLs per country using this provider chain (per AGENTS.md):

1. **Unsplash** (primary)
2. **Pexels** (backup)
3. **Wikipedia** (last resort — no API key)

## Prerequisites (all required)

- `01-country-data-service.md` completed
- **`02-local-redis-setup.md` completed** — Redis running and verified

## Scope

- Create `image.service.ts` — fetch images by country name
- Cache image URL arrays in Redis: key `images:{country}`, TTL 30 days
- Merge `images: string[]` into country objects before returning to clients
- Integrate into `GET /country/:name` and `GET /feed/countries`
- Wikipedia fallback in `image.service.ts` when Unsplash and Pexels return no results (Wikipedia REST + MediaWiki APIs; set a descriptive `User-Agent`)
- Final fallback: empty `images` array when all providers fail (endpoint must still succeed)

## Out of scope

- AI content generation
- Image hosting / CDN upload (URLs only)
- Frontend image caching (mobile handles that separately per AGENTS.md)

## Acceptance criteria

- Country responses include `images` with 1–5 URLs when any provider succeeds
- Provider order is Unsplash → Pexels → Wikipedia → `[]`
- Failed image fetch does not break the country endpoint (graceful fallback)
- Image results are cached in Redis and reused on second request (`Cache hit` in logs)
- No Unsplash/Pexels API keys in the Expo app

## Env vars

- `UNSPLASH_ACCESS_KEY` and/or `PEXELS_API_KEY` in backend `.env` only
