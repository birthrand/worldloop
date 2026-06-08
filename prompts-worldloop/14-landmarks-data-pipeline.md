Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`, `prompts-worldloop/03-image-service.md`

Implement **Feature 14: Landmarks Data Pipeline** — Wikidata + OpenStreetMap landmark discovery with Wikimedia images for every country and territory.

## Goal

Build a robust landmark discovery system for WorldLoop that provides **3–5 notable landmarks** for every country and territory worldwide.

The system should prioritize landmark quality, images, descriptions, and consistency while remaining **free to operate** (no paid APIs).

---

## Current state

A Wikipedia-only landmarks service already exists:

- `backend/src/services/landmarks.service.ts` — search + geo + REST summary (max **3** landmarks)
- `backend/src/types/landmarks.ts` — `CountryLandmark` type (no coordinates, type, or source)
- `GET /country/:name/profile` — returns `landmarks` via `profile.controller.ts`
- Mobile: `CountryLandmarksSection`, `use-ai-explorer-country.ts`, `lib/country-profile-cache.ts`

This prompt **replaces the discovery logic** with Wikidata + OSM while keeping the same endpoint and UI contract. Extend the schema with optional fields; do not break existing clients.

---

## Prerequisites (all required)

- `01-country-data-service.md` completed — country `cca2`, `latlng`, `capital`, `name`
- **`02-local-redis-setup.md` completed** — Redis running and verified
- `03-image-service.md` completed (optional but recommended) — country image fallbacks when Wikimedia has no image

---

## Data sources

### Primary: Wikidata + Wikipedia

Use **Wikidata** as the primary source for landmark discovery.

**Endpoint:** `https://query.wikidata.org/sparql` (set descriptive `User-Agent`)

Retrieve per landmark:

| Field               | Wikidata / Wikipedia                                       |
| ------------------- | ---------------------------------------------------------- |
| Name                | `rdfs:label` (en) or `skos:altLabel`                       |
| Short description   | `schema:description` or Wikipedia extract (first sentence) |
| Coordinates         | `wdt:P625` (coordinate location)                           |
| Country association | `wdt:P17` (country) matched to REST Countries `cca2`       |
| Image               | `wdt:P18` → Wikimedia Commons URL                          |
| Article URL         | `wdt:P856` or `schema:about` → Wikipedia article           |

**Preferred landmark categories** (map to `type` string):

- Castles
- Historic sites
- Monuments
- Museums
- National parks
- UNESCO World Heritage Sites
- Famous buildings
- Religious landmarks
- Natural wonders

Store image URLs from **Wikimedia Commons** whenever available. Resolve Commons file names to direct image URLs via the MediaWiki API or Commons thumb URL pattern.

**Example SPARQL pattern** (adapt per query; filter by country `wd:Q{id}` from `cca2`):

```sparql
SELECT ?item ?itemLabel ?description ?coord ?image ?article WHERE {
  ?item wdt:P17 wd:Q{id} .
  ?item wdt:P625 ?coord .
  OPTIONAL { ?item schema:description ?description . FILTER(LANG(?description) = "en") }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  LIMIT 50
}
```

Add filters for instance-of (`wdt:P31`) / heritage (`wdt:P1435`) / tourism-related subclasses to bias toward notable places.

---

### Secondary: OpenStreetMap + Overpass API

Use **OpenStreetMap** as a fallback when Wikidata returns **fewer than 3** landmarks.

**Endpoint:** `https://overpass-api.de/api/interpreter` (or rotating public mirrors)

Query within the country's boundary (`area["ISO3166-1"="XX"]` or bbox from country `latlng` + generous radius for microstates).

**Tags to query:**

| Tag                  | Purpose             |
| -------------------- | ------------------- |
| `tourism=attraction` | General attractions |
| `tourism=museum`     | Museums             |
| `historic=*`         | Historic sites      |
| `natural=*`          | Natural features    |
| `leisure=park`       | Parks               |

Retrieve:

- Name (`name` tag)
- Coordinates (node lat/lon or way/relation centroid)
- Category (from primary tag)
- Raw tags (for ranking)

OSM landmarks fill **missing slots only** — do not duplicate Wikidata results (fuzzy name match + coordinate proximity).

---

## Landmark selection rules

| Rule      | Value       |
| --------- | ----------- |
| Minimum   | 3 landmarks |
| Preferred | 5 landmarks |
| Maximum   | 5 landmarks |

### Ranking priority

1. UNESCO World Heritage Sites
2. National landmarks
3. Historic landmarks
4. Major museums
5. Natural attractions
6. General tourist attractions

### Avoid

- Duplicate landmarks (same place from both sources)
- Businesses (`shop=*`, `office=*`)
- Hotels (`tourism=hotel`)
- Restaurants (`amenity=restaurant`)
- Generic unnamed map points
- Unnamed OSM nodes (skip if no `name` tag)

### Microstates

Must work for small countries and territories: Liechtenstein, Monaco, Andorra, San Marino, Vatican City, etc. Use country boundary queries and capital-centric bbox fallbacks when ISO area queries return sparse results.

---

## Output schema

### API response shape

```json
{
  "countryCode": "LI",
  "landmarks": [
    {
      "id": "vaduz-castle",
      "name": "Vaduz Castle",
      "type": "Castle",
      "description": "Official residence of the Prince of Liechtenstein",
      "latitude": 47.141,
      "longitude": 9.521,
      "imageUrl": "https://upload.wikimedia.org/...",
      "source": "wikidata"
    }
  ]
}
```

### TypeScript (`backend/src/types/landmarks.ts`)

```ts
export type LandmarkSource = "wikidata" | "osm" | "wikipedia";

export type CountryLandmark = {
  id: string;
  name: string;
  type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  source: LandmarkSource;
};
```

Mirror the type in `lib/api.ts` on the mobile app. New fields are additive — existing UI continues to use `id`, `name`, `description`, `imageUrl`.

---

## Processing flow

```text
Country selected (cca2 + name + latlng + capital)
        │
        ▼
Check Redis cache  landmarks:v5:{cca2}
        │
        ▼
Fetch Wikidata landmarks (SPARQL)
        │
        ▼
Filter & rank results
        │
        ▼
landmark count < 3 ?
        │
        ├─ yes ─► Query Overpass API (OSM)
        │              │
        │              ▼
        │         Filter & rank OSM results
        │
        ▼
Merge sources (dedupe by name + proximity)
        │
        ▼
Limit to top 5
        │
        ▼
Apply image fallbacks (country images from image service)
        │
        ▼
Cache result (30 days)
        │
        ▼
Return response
```

---

## Architecture

```text
GET /country/:name/profile
        │
        ▼
profile.controller.ts
        │
        ▼
landmarks.service.ts  ──► Redis  landmarks:v5:{cca2}  (TTL 30 days)
        │
        ├─► wikidata.service.ts (primary)
        │       └─ SPARQL + Commons image resolution
        │
        └─► osm.service.ts (fallback when count < 3)
                └─ Overpass interpreter
```

**Suggested file layout:**

```text
backend/src/
  services/
    landmarks.service.ts      # orchestration, merge, rank, cache
    wikidata.service.ts       # SPARQL queries, Commons URLs
    osm.service.ts            # Overpass queries, tag parsing
  types/
    landmarks.ts              # extended CountryLandmark type
  utils/
    landmark-ranking.ts       # shared rank + dedupe helpers (optional)
```

Refactor the existing Wikipedia logic into `source: "wikipedia"` only as a **last-resort fallback** if both Wikidata and OSM fail — or remove once the new pipeline is stable.

---

## Caching

| Layer                 | Key                              | TTL                         |
| --------------------- | -------------------------------- | --------------------------- |
| Server (Redis)        | `landmarks:v5:{cca2}`            | 30 days                     |
| Client (AsyncStorage) | existing `country-profile` cache | 30 days (align with server) |

Bump cache key version from `v4` (name-based) to `v5` (cca2-based) when shipping this feature.

Landmark data changes infrequently — long TTL is appropriate.

---

## Performance requirements

- Return landmark data in **under 2 seconds** when cached
- Fetch and cache on first request (no blocking pre-generation required)
- Prevent repeated requests to Wikidata and Overpass (Redis `getOrSet`)
- Rate-limit external calls: small delay between Wikidata/Wikipedia requests (keep existing `WIKI_REQUEST_GAP_MS` pattern)
- Gracefully handle API failures — return partial results or empty `landmarks: []`; **never** fail the profile endpoint

---

## WorldLoop UI usage

Each landmark supports:

- Image (`imageUrl`)
- Name (`name`)
- Type (`type`) — future badge/chip in UI
- Short description (`description`)
- Coordinates (`latitude`, `longitude`) — future map pins / nearby places

**Used in:**

- Country Details Page
- AI Country Explorer (`country-landmarks-section.tsx`)
- Nearby Places Section (future)
- Landmark Cards (future)
- Travel Discovery Features (future)

No UI changes required for initial ship — optional follow-up: show `type` chip and map preview using coordinates.

---

## Scope

- Extend `CountryLandmark` type (backend + `lib/api.ts`)
- Create `wikidata.service.ts` — country landmark SPARQL + image resolution
- Create `osm.service.ts` — Overpass fallback queries
- Refactor `landmarks.service.ts` — orchestrate Wikidata → OSM → merge → rank → limit 5
- Switch cache key to `cca2`-based `landmarks:v5:{cca2}`
- Raise `MAX_LANDMARKS` from 3 to 5
- Keep `GET /country/:name/profile` response shape (`data.landmarks`)
- Set descriptive `User-Agent` on all external requests
- Log source counts per country (`wikidata: 4, osm: 1, total: 5`)

## Out of scope

- Paid landmark APIs (Google Places, Foursquare, etc.)
- Image hosting / CDN upload (URLs only)
- AI-generated landmark descriptions
- Frontend landmark caching changes beyond TTL alignment (optional)
- Pre-generation cron for all countries (optional future step)

---

## Env vars

None required — Wikidata, Overpass, and Wikimedia are free and keyless.

Optional: `OVERPASS_API_URL` override for local/mirror testing.

---

## Acceptance criteria

- [ ] Every country with valid `cca2` can return 3–5 landmarks when data exists
- [ ] Microstates (LI, MC, AD, SM, VA) return at least 3 landmarks
- [ ] Wikidata is queried first; OSM only when Wikidata count < 3
- [ ] Landmarks include `type`, `latitude`, `longitude`, `source` where available
- [ ] Wikimedia image URLs used when `wdt:P18` exists; country image fallbacks otherwise
- [ ] Duplicates removed across sources
- [ ] Results cached in Redis (`landmarks:v5:{cca2}`) with 30-day TTL
- [ ] Second request logs `Cache hit` and responds in < 2s
- [ ] Wikidata/Overpass failures do not break `GET /country/:name/profile`
- [ ] No API keys exposed to the Expo app
- [ ] `npm run lint` and `npm run typecheck` pass

---

## Usage in Cursor

```text
@prompts-worldloop/14-landmarks-data-pipeline.md implement it
```

## Build order

After `03` (image fallbacks) and `08` (cache hardening). Can run in parallel with `13` (news service).

`00` → `01` → **`02`** → `03` → `08` → **`14`** → (optional UI: type chips, map pins)
