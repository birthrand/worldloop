# WorldLoop Backend Prompts

Incremental backend implementation prompts for the WorldLoop API. Implement in numeric order unless a prompt says otherwise.

| #   | Prompt                                                       | Description                                           |
| --- | ------------------------------------------------------------ | ----------------------------------------------------- |
| 00  | [00-backend-overview.md](./00-backend-overview.md)           | Shared architecture, types, cache keys (read first)   |
| 01  | [01-country-data-service.md](./01-country-data-service.md)   | REST Countries metadata + basic feed                  |
| 02  | [02-local-redis-setup.md](./02-local-redis-setup.md)         | **Required** — install & run Redis, verify cache hits |
| 03  | [03-image-service.md](./03-image-service.md)                 | Unsplash / Pexels images per country                  |
| 04  | [04-ai-content-service.md](./04-ai-content-service.md)       | AI facts, captions, narration                         |
| 05  | [05-feed-endpoint.md](./05-feed-endpoint.md)                 | TikTok-style paginated feed                           |
| 06  | [06-search-and-explore.md](./06-search-and-explore.md)       | Search and filter by name / region                    |
| 07  | [07-map-endpoint.md](./07-map-endpoint.md)                   | Map view country data                                 |
| 08  | [08-redis-caching-layer.md](./08-redis-caching-layer.md)     | Central Redis cache service (code hardening)          |
| 09  | [09-backend-security.md](./09-backend-security.md)           | Secrets, validation, rate limits                      |
| 10  | [10-pregeneration-system.md](./10-pregeneration-system.md)   | Background AI pre-generation (optional)               |
| 11  | [11-health-and-monitoring.md](./11-health-and-monitoring.md) | Health check and logging                              |
| 12  | [12-discover-endpoint.md](./12-discover-endpoint.md)         | Spatial bbox discover (pairs with `prompts/15-*`)     |

## Dev prerequisites

- Node.js 20+
- **Docker Desktop** (recommended) — Redis is **required**, not optional
- After `01`: run `02-local-redis-setup.md` before any other backend step

## Usage in Cursor

```text
@prompts-worldloop/01-country-data-service.md implement it
@prompts-worldloop/02-local-redis-setup.md implement it
```

## Build order (required)

`00` → `01` → **`02` (Redis — required)** → `08` (cache layer hardening, if needed) → `05` → `03` → `04` → `09` → `06` → `07` → `11` → `10`

| Phase                | Steps                  | Notes                                             |
| -------------------- | ---------------------- | ------------------------------------------------- |
| Foundation           | `00`, `01`             | Backend + country API                             |
| **Redis (blocking)** | **`02`**               | Must pass before `03`+                            |
| Cache code           | `08`                   | Refine `cache.service.ts`; Redis must already run |
| Enrichment           | `03`, `04`, `05`       | Images, AI, feed                                  |
| Hardening            | `09`, `06`, `07`, `11` | Security, search, map, health                     |
| Optional             | `10`                   | Pre-generation                                    |
| Geo discovery        | `12`                   | After client `prompts/15a`–`15d`; bbox query API  |
