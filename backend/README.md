# WorldLoop Backend

Node.js + TypeScript API for country data, caching, and (later) AI/images.

## Prerequisites

**Redis is required** for local development. All backend features after the country service depend on caching.

### Start Redis (standard workflow)

From the **repo root**:

```bash
docker compose up -d redis
docker compose ps
docker compose exec redis redis-cli ping   # must return PONG
```

If Docker is unavailable:

| Platform | Fallback |
|----------|----------|
| Windows | [Docker Desktop](https://www.docker.com/products/docker-desktop/), [Memurai](https://www.memurai.com/), or `winget install Redis.Redis` (starts on port 6379; use `redis-cli ping`) |
| macOS | `brew install redis && brew services start redis` |
| Linux | `sudo apt install redis-server && sudo systemctl start redis` |
| Any | [Upstash](https://upstash.com/) free Redis — set `REDIS_URL` in `backend/.env` |

Do not proceed with later backend prompts until Redis returns `PONG` and the backend logs `Redis connected`.

## Setup

```bash
cd backend
cp .env.example .env   # includes REDIS_URL=redis://localhost:6379
npm install
```

Ensure Redis is running before `npm run dev`.

## Development

```bash
# repo root — start Redis first
docker compose up -d redis

cd backend
npm run dev
```

Server default: `http://localhost:3001`

Startup logs **must** include `Redis connected`. If you see `Redis unavailable — running without cache`, fix Redis before continuing.

### Verify caching

```bash
curl http://localhost:3001/country/japan
curl http://localhost:3001/country/japan
```

The second request should log `Cache hit` for `country:japan` and `images:japan` in the backend console.

## Image API keys (Feature 3)

Add at least one key to `backend/.env` (never in the Expo app):

- [Unsplash](https://unsplash.com/developers) — `UNSPLASH_ACCESS_KEY` (primary)
- [Pexels](https://www.pexels.com/api/) — `PEXELS_API_KEY` (backup)

Without keys, country responses still work and use static placeholder image URLs.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/country/:name` | Single country with `images[]` (1–5 URLs) |
| GET | `/feed/countries` | All countries with `images[]` per item |

## Examples

```bash
curl http://localhost:3001/country/japan
curl http://localhost:3001/feed/countries
curl http://localhost:3001/country/not-a-real-country
```

## Scripts

- `npm run dev` — watch mode with tsx
- `npm run build` — compile to `dist/`
- `npm run start` — run compiled output
- `npm run typecheck` — TypeScript check
