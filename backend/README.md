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

| Platform | Fallback                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows  | [Docker Desktop](https://www.docker.com/products/docker-desktop/), [Memurai](https://www.memurai.com/), or `winget install Redis.Redis` (starts on port 6379; use `redis-cli ping`) |
| macOS    | `brew install redis && brew services start redis`                                                                                                                                   |
| Linux    | `sudo apt install redis-server && sudo systemctl start redis`                                                                                                                       |
| Any      | [Upstash](https://upstash.com/) free Redis — set `REDIS_URL` in `backend/.env`                                                                                                      |

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

Configure keys in `backend/.env` only (never in the Expo app). Image URLs are resolved in this order:

1. **Unsplash** (primary) — `UNSPLASH_ACCESS_KEY` from [Unsplash Developers](https://unsplash.com/developers)
2. **Pexels** (backup) — `PEXELS_API_KEY` from [Pexels API](https://www.pexels.com/api/) when Unsplash returns no results or is unavailable
3. **Wikipedia** (last resort) — only when both API providers fail or are not configured

Results are **cached per country** in Redis (`images:{country}`, 30-day TTL). Reuse the cached array on subsequent requests; do not call providers again for the same country while the cache entry is valid.

**Orientation:** Unsplash and Pexels searches request **portrait** photos first (TikTok-style Explore hero), then **landscape** to fill up to 5 URLs when portrait results are scarce.

**Resolution:** Redis caches provider **size variants** per country (`images:v2:{country}`). At serve time the backend picks the smallest variant that meets the client `displayWidth` query param (logical CSS width × device pixel ratio), capped at 1920px — so 3× phones get sharper heroes without always downloading originals. Buckets: 640 / 1080 / 1440 / 1920. Map/discover thumbnails use 640px internally.

```bash
curl -s "http://localhost:3001/feed/countries?limit=1&displayWidth=1170" | jq '.data[0].images[0]'
```

Consumers should mirror the same provider fallback order and country-level caching so image behavior stays consistent with the backend.

## Video API (Feature 15)

Configure `PEXELS_API_KEY` and/or `PIXABAY_API_KEY` in `backend/.env` only. When both are unset or all providers return no match, endpoints return `videos: []` with HTTP 200.

- **Providers:** Pexels Video Search API (primary), then Pixabay Video API (fallback)
- **Orientation:** portrait first (TikTok-style Culture feed), landscape fallback
- **Queries:** `{country} culture`, `{country} travel`, `{country} landscape` per orientation pass
- **Cache:** Redis key `videos:{country}` (30-day TTL)
- **Shape:** At most one `CountryVideo` per country — HTTPS MP4 `url`, optional `poster`, `provider`, `duration`

```bash
curl -s "http://localhost:3001/country/Japan/profile" | jq '.data.country.videos'
curl -s "http://localhost:3001/feed/countries?limit=3" | jq '.data[] | {name, videos: .videos | length}'
```

## Endpoints

| Method | Path                      | Description                                            |
| ------ | ------------------------- | ------------------------------------------------------ |
| GET    | `/health`                 | Health check                                           |
| GET    | `/country/:name`          | Single country with `images[]` (1–5 URLs)              |
| GET    | `/feed/countries`         | Paginated feed (`?cursor=&limit=`, default 20, max 30) |
| GET    | `/feed/culture/countries` | Video-only Culture feed (`?seed=&cursor=&limit=`)      |
| GET    | `/map/countries`          | All map countries with coordinates and first image     |
| GET    | `/discover`               | Spatial bbox discover — ranked countries in viewport   |

## Examples

```bash
curl http://localhost:3001/country/japan
curl "http://localhost:3001/feed/countries?limit=20"
curl "http://localhost:3001/feed/countries?cursor=20&limit=20"
curl "http://localhost:3001/feed/culture/countries?seed=session-1&limit=20"
curl http://localhost:3001/country/not-a-real-country

# Europe-ish bbox
curl "http://localhost:3001/discover?west=-10&south=35&east=40&north=70&limit=20"

# With center for ranking (Japan near top when center is Tokyo)
curl "http://localhost:3001/discover?west=100&south=-10&east=150&north=25&centerLat=35.68&centerLng=139.69"
```

## Scripts

- `npm run dev` — watch mode with tsx
- `npm run build` — compile to `dist/`
- `npm run start` — run compiled output
- `npm run typecheck` — TypeScript check
