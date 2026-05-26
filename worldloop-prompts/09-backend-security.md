Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 9: Backend Security** for the WorldLoop backend.

## Goal

Keep secrets safe, validate inputs, and prevent API abuse.

## Prerequisites (all required)

- `01-country-data-service.md` and core routes exist
- **`02-local-redis-setup.md` completed** — Redis running and verified

## Scope

- Ensure all secrets live in `backend/.env` only (never in Expo app):
  - OpenAI, Unsplash, Pexels, Redis URL
- Add `.env.example` with placeholder keys (no real secrets)
- Validate route params and query strings (name, cursor, limit, query, region)
- Sanitize / reject invalid `limit` (e.g. max 30)
- Rate-limit public endpoints (e.g. `express-rate-limit` or Fastify equivalent)
- Stricter rate limit on `POST /ai/generate`
- Validate external API JSON shapes before caching
- Optional: verify Clerk JWT on protected routes if mobile sends auth headers

## Out of scope

- Full WAF / DDoS protection
- OAuth implementation (Clerk handles auth on mobile)

## Acceptance criteria

- No secret keys in `app/`, `lib/`, or committed files
- Invalid `limit=9999` returns 400
- Rate limit returns 429 with clear message when exceeded
- Malformed upstream API response does not get cached
- `.env` is in `.gitignore`

## AGENTS.md alignment

> Never expose API keys in frontend. All AI calls must go through backend/serverless functions.
