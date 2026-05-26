Read AGENTS.md first and follow it strictly.

This is the shared reference for all WorldLoop backend prompts in `prompts-worldloop/`. Do not implement features from this file alone — use the numbered feature prompts.

---

## System overview

WorldLoop backend is a content enrichment, AI generation, and caching engine for a TikTok-style country discovery mobile app.

It should:

- Aggregate country data from external APIs
- Enrich with AI-generated content and images
- Serve fast, mobile-first feed responses
- Cache aggressively to reduce cost and latency

**Redis is required** for local development and production caching. Prompt `02-local-redis-setup.md` runs immediately after `01` and must pass before later steps.

---

## Architecture

```text
Mobile App (Expo)
        │
        ▼
API Gateway (Node.js / Express or Fastify)
        │
 ┌──────┼─────────────────────┐
 ▼      ▼                     ▼
Country  AI Service        Cache Layer
Service  (LLM)              (Redis)  ← required
 │       │                     │
 ▼       ▼                     ▼
External APIs            Cache storage
- REST Countries
- World Bank (optional)
- Unsplash / Pexels

```

---

## Tech stack

- **Runtime:** Node.js + TypeScript
- **API:** REST (Express or Fastify)
- **Cache:** Redis server + `redis` npm package (**required**)
- **AI:** OpenAI API (server-side only)
- **Data:** REST Countries API (primary), World Bank (optional), Unsplash / Pexels (images)

---

## Local Redis (required after step 01)

See **`02-local-redis-setup.md`** for full agent instructions. Summary:

1. Add repo-root `docker-compose.yml` with Redis on port `6379`
2. Run `docker compose up -d redis`
3. Confirm `PONG` via `redis-cli ping`
4. Backend must log `Redis connected` on startup
5. Repeat API calls must log `Cache hit`

Default URL: `REDIS_URL=redis://localhost:6379` in `backend/.env`.

**Do not implement prompts `03`–`11` until step `02` acceptance criteria pass.**

Graceful degradation (serve without cache when Redis is down) may exist in code for resilience, but **agents must not skip installing Redis** — step `02` is a hard gate.

---

## Folder structure

```text
backend/
  src/
    api/
      country.routes.ts
      feed.routes.ts
      search.routes.ts
      map.routes.ts
      ai.routes.ts
      health.routes.ts
    controllers/
    services/
      country.service.ts
      image.service.ts
      ai.service.ts
      cache.service.ts
      feed.service.ts
      search.service.ts
      map.service.ts
    lib/
      llm.ts
      http.ts
    config/
      env.ts
    utils/
      logger.ts
docker-compose.yml    # Redis — added in prompt 02

```

---

## Country data model

```ts
type Country = {
  name: string;
  capital: string;
  region: string;
  population: number;
  flag: string;
  latlng: [number, number];
  images: string[];
  ai: {
    fact: string;
    caption: string;
    narration: string;
  };
};
```

Early features may return partial objects (e.g. no `images` or `ai` until those prompts are done).

---

## AI output shape (strict JSON)

```json
{
  "fact": "Japan has more pets than children in some regions.",
  "caption": "Japan blends futuristic cities with deep traditions 🇯🇵",
  "narration": "Here's something interesting about Japan..."
}
```

---

## Cache keys and TTLs

| Key pattern               | TTL     |
| ------------------------- | ------- |
| `country:{name}`          | 90 days |
| `feed:countries:{cursor}` | 7 days  |
| `ai:{country}`            | 7 days  |
| `images:{country}`        | 30 days |

---

## Security (all features)

- Never expose API keys in the Expo app
- All AI and image API calls are server-side only
- Validate external API responses before caching

---

## Deployment options

- **Simple:** Render, Railway, or Fly.io (+ managed Redis or Upstash)
- **Scalable:** AWS Lambda + API Gateway, ElastiCache Redis

---

## Mental model

> Data enrichment + AI + caching engine for a swipe-based geography feed. Redis is part of the core stack, not an optional add-on.
