Read AGENTS.md first and follow it strictly.

Reference: [`../prompts/15-geo-aware-discovery-overview.md`](../prompts/15-geo-aware-discovery-overview.md), `prompts-worldloop/00-backend-overview.md`, `prompts-worldloop/07-map-endpoint.md`

Implement **Feature 12: Discover endpoint** — spatial country queries for the geo-aware discovery layer.

## Goal

Add `GET /discover` so the mobile app (or future clients) can fetch **ranked countries in a bounding box** without loading the full map list and filtering on device.

**Ship this after** client Steps 1–4 in [`15a`–`15d`](../prompts/15-geo-aware-discovery-overview.md) are working with the on-device geo index. The app should **fallback to client-side** `countriesInBBox` when the endpoint is unavailable.

---

## Prerequisites

- `01-country-data-service.md` and `07-map-endpoint.md` completed
- **`02-local-redis-setup.md` completed** — Redis running
- Client geo index proven ([`15a-spatial-model-and-geo-index.md`](../prompts/15a-spatial-model-and-geo-index.md))

---

## Endpoint

### `GET /discover`

**Query parameters**

| Param       | Required | Description                                                           |
| ----------- | -------- | --------------------------------------------------------------------- |
| `west`      | yes\*    | Bbox west longitude (-180..180)                                       |
| `south`     | yes\*    | Bbox south latitude (-90..90)                                         |
| `east`      | yes\*    | Bbox east longitude                                                   |
| `north`     | yes\*    | Bbox north latitude                                                   |
| `centerLat` | no       | Viewport center lat — for ranking (default: bbox center)              |
| `centerLng` | no       | Viewport center lng                                                   |
| `region`    | no       | Optional continent filter (matches app region normalization)          |
| `limit`     | no       | Default 30, max 50                                                    |
| `cursor`    | no       | Offset pagination (optional v1 — may return full bbox set if ≤ limit) |

\* Required together for `mode=bbox`. Future: `near=lat,lng&radiusKm=` — out of v1 unless trivial.

**Response**

```ts
type DiscoverResponse = {
  data: MapCountry[]; // or CountryBasic[] — match map endpoint shape
  meta: {
    count: number;
    bbox: { west: number; south: number; east: number; north: number };
    region: string | null;
    nextCursor: string | null;
  };
};
```

**Ranking**

1. Countries whose bbox intersects query bbox
2. Sort by distance from center to country centroid (ascending)
3. Tie-break: population desc

**Validation**

- Reject invalid bbox (south > north, out of range) → 400
- Reject `limit > 50` → 400
- Empty result → 200 with `data: []`

---

## Implementation

### Files to add

| Path                                       | Purpose                                |
| ------------------------------------------ | -------------------------------------- |
| `backend/src/types/discover.ts`            | Request/response types                 |
| `backend/src/services/discover.service.ts` | Bbox filter + rank                     |
| `backend/src/api/discover.routes.ts`       | Express router                         |
| `backend/src/lib/geo-bbox.ts`              | Bbox intersect, antimeridian normalize |

### Files to change

| Path                                    | Change                         |
| --------------------------------------- | ------------------------------ |
| `backend/src/index.ts`                  | Mount `/discover`              |
| `backend/src/services/cache.service.ts` | `cacheKeys.discover(...)`, TTL |
| `backend/README.md`                     | Document endpoint              |

### Geo index on server

At startup or first request:

- Load countries from existing `getFeedCountries()`
- Attach bbox per country:
  - Prefer precomputed JSON asset (optional `backend/data/country-bboxes.json` generated once from Natural Earth)
  - Fallback: centroid ± 2° padding (document as temporary)

Do not bundle full Natural Earth polygons on server in v1 unless needed — **bbox only**.

### Caching

```ts
cacheKeys.discover({ west, south, east, north, region, limit });
```

- TTL: 24h (same order as `map:countries`)
- Cache ** ranked id list** or full `MapCountry[]` — keep payloads small

---

## Mobile integration (after backend ships)

| Path                                 | Change                                              |
| ------------------------------------ | --------------------------------------------------- |
| `lib/api.ts`                         | `fetchDiscoverCountries(params)`                    |
| `store/use-spatial-context-store.ts` | Try `/discover` on commit; fallback to client index |
| `constants/client-cache.ts`          | `CLIENT_CACHE_KEYS.discover(bboxKey)`               |

SWR: show client index immediately; swap when server returns.

---

## Security

- Public read endpoint — apply rate limit from `09-backend-security.md` when that prompt is done
- No secrets in query params
- Validate all numeric inputs

---

## Out of scope

- PostGIS / Mongo geo indexes
- Cities / POIs
- User location storage

---

## Acceptance criteria

- [ ] Valid bbox returns intersecting countries, ranked by center distance
- [ ] `region=Europe` narrows results
- [ ] Invalid bbox → 400
- [ ] Second identical request → Redis cache hit logged
- [ ] `npm run typecheck` passes in `backend/`
- [ ] curl example in `backend/README.md` works

---

## Examples

```bash
# Europe-ish bbox
curl "http://localhost:3001/discover?west=-10&south=35&east=40&north=70&limit=20"

# With center for ranking
curl "http://localhost:3001/discover?west=100&south=-10&east=150&north=25&centerLat=0&centerLng=120"
```

---

## Testing

1. Start Redis + backend
2. curl bbox over Japan → includes Japan near top when center is Tokyo
3. Repeat request → cache hit in logs
4. Mobile: disable wifi mid-scope → client fallback still shows countries

---

## Build order note

This prompt is **Step 6** in [`15-geo-aware-discovery-overview.md`](../prompts/15-geo-aware-discovery-overview.md). Client-only discovery is valid without this endpoint until scale or ranking complexity warrants server-side query.
