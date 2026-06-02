Read AGENTS.md first and follow it strictly.

Reference: [`13d-map-v3-ui-ux-upgrade.md`](./13d-map-v3-ui-ux-upgrade.md), [`14-client-side-cache.md`](./14-client-side-cache.md), [`08-zustand.md`](./08-zustand.md), `prompts-worldloop/07-map-endpoint.md`

Implement **Geo-Aware Discovery**: turn WorldLoop from “countries with pins + a separate global feed” into a **spatial content layer** where **where you look on the map determines what you discover**.

This is a **behavior + data + wiring** upgrade. Do not redesign Explore cards, preview visuals, or globe rendering unless a step explicitly says so.

---

## Problem (current behavior)

| Layer             | Today                                                             | Gap                                             |
| ----------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| **Content unit**  | `Country` with one `latlng` centroid                              | No shared geo index; boundaries are render-only |
| **Map**           | Strong spatial UX (globe, polygons, continent focus)              | Camera context does not drive content           |
| **Explore feed**  | Paginated global list; optional region chip filter                | **Not** tied to map viewport                    |
| **Map ↔ Explore** | Jump by country name (`openCountryInExplore`, `pendingMapIntent`) | No shared discovery queue or spatial scope      |
| **Backend**       | Full country list; filter by name/region string                   | No bbox / proximity queries                     |
| **Progress**      | Mock stats on Home                                                | Not geographic                                  |

The map is geo-aware. **Content discovery mostly is not.**

---

## Target mental model

```txt
User gesture (pan, zoom, tap, optional device location)
        │
        ▼
Spatial context (viewport bbox, zoom tier, focused region, active country)
        │
        ▼
Discovery query (countries — later cities/POIs — in that context)
        │
        ▼
Surfaces (Map chrome, Explore feed, preview, Home progress)
```

Everything shares one **`discoveryScope`** — not separate “map state” and “feed state” that happen to both mention a region name.

---

## Build order (important)

Do **not** implement the full spatial layer in one pass. Each step must work on device before the next.

| Step  | Prompt                                                                                         | What you build                                                                |
| ----- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **1** | [`15a-spatial-model-and-geo-index.md`](./15a-spatial-model-and-geo-index.md)                   | Geo types, country bbox index, client-side spatial query helpers              |
| **2** | [`15b-spatial-context-and-viewport-query.md`](./15b-spatial-context-and-viewport-query.md)     | `SpatialContext` store; map settle → update scope; countries-in-viewport      |
| **3** | [`15c-viewport-driven-explore.md`](./15c-viewport-driven-explore.md)                           | “Explore this area” / **Here** mode; feed filtered by discovery scope         |
| **4** | [`15d-map-explore-sync.md`](./15d-map-explore-sync.md)                                         | Shared `discoveryQueue`; spatial FAB/shuffle; Explore ↔ Map context handoff   |
| **5** | [`15e-geo-progress-passport-layer.md`](./15e-geo-progress-passport-layer.md)                   | Real discovery progress; visited countries on map; honest Home stats          |
| **6** | [`../prompts-worldloop/12-discover-endpoint.md`](../prompts-worldloop/12-discover-endpoint.md) | Backend `GET /discover` (bbox, cache) — optional until client index is proven |

Step 6 can ship **after** Steps 1–4 using client-only queries. Add the backend endpoint when bbox queries need server-side ranking or scale.

---

## Prerequisites (all required)

- [`13d-map-v3-ui-ux-upgrade.md`](./13d-map-v3-ui-ux-upgrade.md) **completed** — focus-first map UX stable in 2D and 3D
- [`14-client-side-cache.md`](./14-client-side-cache.md) **completed** — `lib/client-cache.ts`, map + feed SWR
- [`10a-explore-ui.md`](./10a-explore-ui.md) + [`10c-search-ui.md`](./10c-search-ui.md) — Explore feed and search wired
- `prompts-worldloop/07-map-endpoint.md` — `GET /map/countries` returns countries with `latlng`
- Backend + Redis running locally for enrichment (`GET /country/:name`)

---

## Zoom tiers (shared vocabulary)

Use these tiers across all steps:

| Tier          | Trigger (approx.)              | Map shows                 | Discovery pool              |
| ------------- | ------------------------------ | ------------------------- | --------------------------- |
| **world**     | Globe far / world region delta | Continent clusters        | Global / trending           |
| **continent** | Region focused or mid zoom     | Country flags in viewport | Countries in focused region |
| **country**   | Country focused                | Boundary fill + pin       | Active country + neighbors  |
| **local**     | _(future)_                     | Cities / POIs             | Place-level content         |

Steps 1–5 implement **world → continent → country**. Do not add cities/POIs without user approval.

---

## Architecture target (after all steps)

```txt
types/geo.ts                    — BBox, ZoomTier, GeoEntity, DiscoveryScope
lib/geo-index.ts                — country bboxes from Natural Earth + REST Countries
lib/spatial-query.ts            — countriesInBBox, countriesNearPoint, rankByViewportCenter
store/use-spatial-context-store.ts — viewport, tier, discoveryScope, discoveryQueue
store/use-discovery-progress-store.ts — real visited set (replaces mock stats)
hooks/use-map-logic.ts          — on settle → update spatial context
store/use-country-feed-store.ts — discoveryScope modes: forYou | here | region
components/map/map-discovery-chrome.tsx — “N countries in view · Explore this area”
lib/open-country-in-explore.ts  — pass spatial context with handoff
prompts-worldloop/12-discover-endpoint.md — server bbox query (step 6)
```

Reuse existing files — do not fork map or feed state:

- `lib/map-country-boundaries.ts` — source for polygon/bbox data
- `lib/map-region-settle.ts` — extend settle hooks for scope updates
- `lib/map-random-pick.ts` — extend with viewport pool
- `lib/open-country-on-map.ts`, `lib/open-country-in-explore.ts`

---

## Out of scope (all steps)

- Cities, landmarks, Wikidata POIs (future `15f` if requested)
- User device GPS / “near me” (optional stretch in 15b — permission-gated)
- Mapbox, Cesium, new map libraries
- React Query / MMKV
- Full social feed, comments, UGC
- Redesigning Explore or preview card visuals

---

## Final acceptance (after Step 5)

- [ ] Pan/zoom map → `discoveryScope` updates after settle (debounced)
- [ ] Map chrome shows count of countries in current viewport (when tier ≥ continent)
- [ ] **Explore this area** opens Explore in **Here** mode with viewport-filtered countries
- [ ] Random FAB / shuffle can draw from **viewport pool** when scope is set
- [ ] Map → Explore and Explore → Map preserve spatial context (same queue order where possible)
- [ ] Visited countries styled differently on map; Home stats reflect real unique views
- [ ] 2D and 3D modes behave the same for spatial discovery
- [ ] `npm run lint` and `npm run typecheck` pass

---

## Usage in Cursor

```text
@prompts/15-geo-aware-discovery-overview.md
@prompts/15a-spatial-model-and-geo-index.md implement it
@prompts/15b-spatial-context-and-viewport-query.md implement it
```

---

## Teaching notes (for students)

After Step 5, document briefly:

1. Why **centroid** vs **bbox** vs **polygon** matter for discovery
2. How **viewport settle debouncing** avoids query storms during pan
3. Why one **`discoveryScope`** beats syncing `focusedRegion` + `selectedRegion` manually
4. Client index first, **backend `/discover` second** — when to move query server-side
