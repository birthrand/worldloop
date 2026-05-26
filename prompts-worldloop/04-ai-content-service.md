Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 4: AI Content Service** for the WorldLoop backend.

## Goal

Generate fun facts, TikTok-style captions, and narration scripts per country using an LLM.

## Prerequisites (all required)

- `01-country-data-service.md` completed
- **`02-local-redis-setup.md` completed** — Redis running and verified

## Scope

- Create `ai.service.ts` and `lib/llm.ts` (OpenAI or compatible API)
- Internal endpoint: `POST /ai/generate` — body: `{ countryName: string }` or country metadata
- Input: country metadata (name, population, region, capital, etc.)
- Output: strict JSON matching the AI shape in `00-backend-overview.md`
- Cache in Redis: key `ai:{country}`, TTL 7 days
- Merge `ai: { fact, caption, narration }` into `GET /country/:name` when serving full country objects
- Do **not** expose this endpoint to the public mobile app without auth (internal / server use only)

## Out of scope

- Feed pagination logic
- Pre-generation cron (see `10-pregeneration-system.md`)

## Acceptance criteria

- `POST /ai/generate` returns valid JSON for a test country
- Second request for same country reads from Redis cache (no duplicate LLM call; log `Cache hit`)
- Invalid LLM responses are handled without crashing the server
- `OPENAI_API_KEY` (or equivalent) only in backend `.env`

## Prompt guidelines

- Keep facts engaging and family-friendly
- Captions short (1–2 lines), suitable for a swipe feed overlay
- Narration 2–4 sentences, spoken-tone
