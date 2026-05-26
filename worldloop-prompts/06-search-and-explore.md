Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 6: Search & Explore** for the WorldLoop backend.

## Goal

Let users search countries by name and filter by region (optional population range later).

## Prerequisites (all required)

- `01-country-data-service.md` completed
- **`02-local-redis-setup.md` completed** — Redis running and verified
- Enriched country pipeline from `03`, `04`, `05` recommended

## Scope

- `GET /search?query=<string>&region=<region>`
- Search by country name (partial match, case-insensitive)
- Optional `region` filter (e.g. Europe, Asia)
- Return enriched country objects (metadata + images + ai) using cache when possible
- Cache popular search results in Redis (e.g. `search:{query}:{region}`, TTL 7 days)

## Out of scope

- Full-text search engine (Elasticsearch, etc.)
- Complex population range filters (optional stretch goal)

## Acceptance criteria

- `GET /search?query=jap` returns Japan (and any other partial matches)
- `GET /search?query=&region=Europe` returns European countries
- Results use cached country objects when available
- Empty query with no region returns 400 or sensible default (document behavior)

## Test

- Search "brazil", "united", region "Africa"
- Verify response times improve on repeated identical searches (Redis cache hits)
