Read AGENTS.md first and follow it strictly.

Parent: [`15-geo-aware-discovery-overview.md`](./15-geo-aware-discovery-overview.md) · Next: [`15b-spatial-context-and-viewport-query.md`](./15b-spatial-context-and-viewport-query.md)

## Step 1 — Spatial model & geo index

**Goal:** Introduce shared geo types and a **client-side country index** (centroid + bbox) so spatial queries are possible without new backend endpoints yet.

This step is **pure types + lib** — no UI changes, no store wiring.

---

## Problem

Today:

- `Country` / `MapCountry` have `latlng` only — one point per country
- Natural Earth boundaries in `lib/map-country-boundaries.ts` are used for **rendering and hit-test**, not discovery queries
- No `BBox`, no `countriesInBBox()`, no ranking by viewport center

---

## Prerequisites

- [`15-geo-aware-discovery-overview.md`](./15-geo-aware-discovery-overview.md) read first
- [`13d-map-v3-ui-ux-upgrade.md`](./13d-map-v3-ui-ux-upgrade.md) completed
- `assets/geo/ne_50m_admin_0_countries/` GeoJSON already bundled (used by map boundaries)

---

## Files to add

| Path                        | Purpose                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `types/geo.ts`              | `BBox`, `ZoomTier`, `GeoEntityKind`, `GeoEntity`, `DiscoveryScope`, `DiscoveryScopeMode` |
| `lib/geo-index.ts`          | Build + cache in-memory index: `MapCountry` + bbox + optional polygon ref                |
| `lib/spatial-query.ts`      | Pure functions: `countriesInBBox`, `countriesNearPoint`, `rankCountriesByViewportCenter` |
| `lib/spatial-query.test.ts` | Unit tests for bbox intersection and ranking                                             |
| `constants/geo.ts`          | `WORLD_COUNTRY_COUNT` (~195), default search radii, tier thresholds                      |

## Files to change (minimal)

| Path                            | Change                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `lib/map-country-boundaries.ts` | Export or reuse ring bbox helper for index build (do not duplicate polygon parsing) |

---

## Types (`types/geo.ts`)

```ts
export type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type ZoomTier = "world" | "continent" | "country" | "local";

export type GeoEntityKind = "country"; // extend later: "city" | "landmark"

export type GeoEntity = {
  kind: GeoEntityKind;
  id: string; // stable: cca2 or name slug
  name: string;
  cca2: string;
  region: string;
  centroid: [number, number]; // [lat, lng]
  bbox: BBox;
};

export type DiscoveryScopeMode = "forYou" | "here" | "region";

export type DiscoveryScope = {
  mode: DiscoveryScopeMode;
  tier: ZoomTier;
  bbox: BBox | null;
  focusedRegion: string | null;
  activeCountryName: string | null;
  /** ISO timestamp when scope last committed (after settle). */
  settledAt: number;
};
```

Keep aligned with existing `MapCountry` / `Country` — do not replace `types/country.ts`.

---

## Geo index (`lib/geo-index.ts`)

**Build once** from:

1. `useMapStore` countries (or `GET /map/countries` payload) for centroids + names + `cca2`
2. Natural Earth features for **bbox** (and optional simplified polygon id for future)

API:

```ts
export function buildGeoIndex(countries: MapCountry[]): GeoEntity[];

export function getGeoIndex(): GeoEntity[] | null;

export function ensureGeoIndex(countries: MapCountry[]): GeoEntity[];
```

**Rules**

- Skip countries with invalid `latlng` (reuse `isValidLatLng` from `lib/map-country.ts`)
- Match boundary features to countries via existing `countryNamesMatch` / ADMIN name logic
- If no polygon match, derive bbox from centroid ± small padding (fallback only — log in dev)
- Index lives in module memory; rebuild when map countries array identity/count changes
- Do **not** persist full polygon sets to AsyncStorage in this step

---

## Spatial query (`lib/spatial-query.ts`)

Pure functions only — no React, no fetch.

```ts
export function bboxContainsPoint(
  bbox: BBox,
  lat: number,
  lng: number,
): boolean;

export function bboxesIntersect(a: BBox, b: BBox): boolean;

export function countryIntersectsBBox(entity: GeoEntity, bbox: BBox): boolean;

export function countriesInBBox(index: GeoEntity[], bbox: BBox): GeoEntity[];

export function rankCountriesByViewportCenter(
  matches: GeoEntity[],
  center: { lat: number; lng: number },
): GeoEntity[];

export function countriesNearPoint(
  index: GeoEntity[],
  lat: number,
  lng: number,
  limit: number,
): GeoEntity[];
```

**Ranking:** nearest centroid to viewport center first; tie-break by population if available on `MapCountry` lookup.

**Antimeridian:** if bbox crosses ±180°, normalize or split query — document approach in code comment; add test case.

---

## Tests (`lib/spatial-query.test.ts`)

Minimum cases:

- Point inside / outside bbox
- Two countries in bbox → correct count
- Ranking: center closer country first
- Bbox crossing antimeridian (e.g. Fiji / Pacific) does not drop valid matches

Run: `npm run test` (vitest).

---

## Out of scope

- Zustand stores
- Map UI
- Backend endpoints
- Device GPS

---

## Acceptance criteria

- [ ] `types/geo.ts` exported and imported without circular deps
- [ ] `ensureGeoIndex(mapCountries)` returns ~190+ entities when map data loaded
- [ ] `countriesInBBox` returns expected countries for a known bbox (e.g. Europe west-of-Urals slice)
- [ ] Unit tests pass
- [ ] No new npm packages
- [ ] `npm run typecheck` passes

---

## Testing (manual)

In `app/dev.tsx` (temporary debug section — remove or gate behind `__DEV__` before ship):

```ts
// After map countries load:
const index = ensureGeoIndex(countries);
const europeBox = { west: -10, south: 35, east: 40, north: 70 };
console.log(
  "in bbox",
  countriesInBBox(index, europeBox).map((c) => c.name),
);
```

---

## Next step

[`15b-spatial-context-and-viewport-query.md`](./15b-spatial-context-and-viewport-query.md) — wire viewport → `DiscoveryScope` on map settle.
