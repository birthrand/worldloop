Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 2: Local Redis Setup (required)** for the WorldLoop backend.

> **Run this immediately after `01-country-data-service.md`.** Redis is **required** for this project — not optional. Do not proceed to `03`+ until Redis is installed, running, and verified.

## Goal

Ensure a Redis server is running locally (or via Docker) and that the backend connects successfully before any further backend features.

## Prerequisites

- `01-country-data-service.md` completed (`backend/` exists with `cache.service.ts`)

## Scope

### 1. Add Docker Compose (preferred)

Create `docker-compose.yml` at the **repo root**:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - worldloop-redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  worldloop-redis-data:
```

### 2. Environment

- Ensure `backend/.env` (or repo root `.env` loaded by backend) contains:
  - `REDIS_URL=redis://localhost:6379`
- Update `backend/.env.example` if missing `REDIS_URL`

### 3. Start Redis (agent must run commands)

```bash
docker compose up -d redis
docker compose ps
docker compose exec redis redis-cli ping   # must return PONG
```

If Docker is unavailable, document and attempt **one** fallback:

| Platform | Fallback |
|----------|----------|
| Windows | Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) **or** [Memurai](https://www.memurai.com/) on port 6379 |
| macOS | `brew install redis && brew services start redis` |
| Linux | `sudo apt install redis-server && sudo systemctl start redis` |
| Any | [Upstash](https://upstash.com/) free Redis — set `REDIS_URL` to the provided URL |

**Do not mark this prompt complete** until `PONG` is confirmed.

### 4. Verify backend connection

```bash
cd backend && npm run dev
```

Startup logs **must** include: `Redis connected`

Then verify caching:

```bash
curl http://localhost:3001/country/japan
curl http://localhost:3001/country/japan   # second call
```

Logs **must** show `Cache hit` on the second request for the same key.

### 5. Documentation

Update `backend/README.md` with:

- `docker compose up -d redis` as the standard dev workflow
- How to verify Redis (`redis-cli ping`, backend logs)
- Note that Redis is **required** for all subsequent backend prompts

## Out of scope

- Redis Cluster / production HA
- Changing cache key design (see `08-redis-caching-layer.md`)
- Refactoring `cache.service.ts` beyond connection fixes needed to connect reliably

## Acceptance criteria (all required)

- [ ] `docker-compose.yml` exists at repo root and Redis container is **running**
- [ ] `redis-cli ping` (via Docker exec or local CLI) returns `PONG`
- [ ] Backend startup logs `Redis connected` (not “running without cache”)
- [ ] Second identical `GET /country/japan` logs `Cache hit`
- [ ] `backend/README.md` documents Redis as required dev dependency

## Failure handling

If Redis cannot be started after trying Docker + one fallback:

- Stop and report what failed (Docker not installed, port in use, etc.)
- Do **not** silently continue with cache disabled for later prompts

## Test

```bash
docker compose up -d redis
cd backend && npm run dev
curl http://localhost:3001/country/japan
curl http://localhost:3001/country/japan
```
