Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 7: Map Endpoint** for the WorldLoop backend.

## Goal

Serve lightweight country data optimized for the interactive world map screen.

## Prerequisites (all required)

- `01-country-data-service.md` completed
- **`02-local-redis-setup.md` completed** — Redis running and verified
- `03-image-service.md` recommended (first image for map markers)

## Scope

- `GET /map/countries`
- Return array of map-friendly objects:
  - `name`, `latlng`, `region`, `population`, `flag`
  - `image` — first image URL only (or null)
  - Optional: `capital` for bottom sheet preview
- Cache response: key `map:countries`, TTL 30 days
- Keep payload smaller than full feed objects (no AI narration in list response)

## Out of scope

- Server-side map clustering (optional stretch — document if skipped)
- Client map rendering (Expo app handles UI)

## Acceptance criteria

- All countries with valid coordinates are included
- Response is smaller than full `Country` feed payloads
- Map screen can tap a country and use `GET /country/:name` for full detail
- Cached endpoint responds quickly on repeat requests (Redis `Cache hit`)

## Mobile integration note

Per AGENTS.md, map screen uses country data model + bottom sheet; wire `lib/api.ts` in the app when this endpoint exists.
