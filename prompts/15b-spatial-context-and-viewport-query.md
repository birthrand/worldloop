Read AGENTS.md first and follow it strictly.

Parent: [`15-geo-aware-discovery-overview.md`](./15-geo-aware-discovery-overview.md) · Previous: [`15a-spatial-model-and-geo-index.md`](./15a-spatial-model-and-geo-index.md) · Next: [`15c-viewport-driven-explore.md`](./15c-viewport-driven-explore.md)

## Step 2 — Spatial context & viewport query

**Goal:** Add a **`useSpatialContextStore`** that commits **`DiscoveryScope`** when the map camera settles, and exposes **countries in the current viewport**.

Map chrome may show a lightweight count — full “Explore this area” CTA comes in Step 3.

---

## Problem

- `useMapUiStore.focusedRegion`, `useIdentityStore.activeCountry`, and feed `selectedRegion` are **three separate concepts**
- `map-region-settle.ts` detects continent tier changes but does not produce a **discovery scope**
- Pan/zoom does not update any content-facing state

---

## Prerequisites

- [`15a-spatial-model-and-geo-index.md`](./15a-spatial-model-and-geo-index.md) **completed**
- [`13d-map-v3-ui-ux-upgrade.md`](./13d-map-v3-ui-ux-upgrade.md) completed
- `hooks/use-map-logic.ts` — map settle / camera flight hooks exist

---

## Files to add

| Path                                    | Purpose                                                                |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `store/use-spatial-context-store.ts`    | `discoveryScope`, `viewportCountries`, `commitScope()`, `clearScope()` |
| `lib/map-viewport-bbox.ts`              | Derive `BBox` + `ZoomTier` from 2D `Region` or globe camera state      |
| `lib/discovery-scope.ts`                | Build `DiscoveryScope` from map UI state + viewport bbox               |
| `components/map/map-discovery-hint.tsx` | Small non-blocking hint: “24 countries in view” (no CTA yet)           |

## Files to change

| Path                            | Change                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `hooks/use-map-logic.ts`        | On settle (after flight / region commit): call `commitScopeFromMap(...)`       |
| `components/map/globe-view.tsx` | Expose camera center + distance (or reuse existing debug state) for bbox on 3D |
| `components/map/map-canvas.tsx` | Pass 2D `Region` on settle for bbox on 2D                                      |
| `app/(tabs)/map.tsx`            | Render `MapDiscoveryHint` when tier ≥ continent and not in preview             |
| `store/index.ts`                | Re-export `useSpatialContextStore` if barrel exists                            |

---

## Store shape (`use-spatial-context-store.ts`)

```ts
type SpatialContextState = {
  discoveryScope: DiscoveryScope;
  /** Countries matching current scope (ordered by viewport center). */
  viewportCountries: GeoEntity[];
  /** Names only — cheap selector for UI badges. */
  viewportCountryCount: number;

  commitScope: (input: CommitScopeInput) => void;
  clearScope: () => void;
};

type CommitScopeInput = {
  bbox: BBox | null;
  tier: ZoomTier;
  focusedRegion: string | null;
  activeCountryName: string | null;
  viewportCenter: { lat: number; lng: number };
  mode?: DiscoveryScopeMode; // default preserves current mode
};
```

**On `commitScope`:**

1. `ensureGeoIndex(mapCountries)` from `useMapStore`
2. If `tier === "world"` or bbox null → `viewportCountries = []`, count = 0
3. Else `countriesInBBox` → `rankCountriesByViewportCenter`
4. If `focusedRegion` set, optionally **intersect** with region filter (continent tier)
5. If `activeCountryName` set at country tier, scope may narrow to neighbors (optional — document if deferred)

**Default scope mode:** `"forYou"` until user taps Explore this area (Step 3).

---

## Viewport bbox (`lib/map-viewport-bbox.ts`)

```ts
export function bboxFromMapRegion(region: Region): BBox;

export function bboxFromGlobeCamera(state: {
  targetLat: number;
  targetLng: number;
  distance: number;
}): BBox;

export function resolveZoomTier(input: {
  mapMode: "2d" | "3d";
  latitudeDelta?: number;
  globeDistance?: number;
  focusedRegion: string | null;
  activeCountryName: string | null;
}): ZoomTier;
```

Reuse thresholds from existing map code (`map-camera-zoom.ts`, `map-region-settle.ts`) — **do not invent conflicting tier boundaries**.

---

## Debouncing

- Do not commit scope on every frame during pan
- Commit when:
  - Camera flight completes
  - Region settle timer fires (`shouldCommitScheduledRegionSwitch`)
  - User finishes continent intent commit
  - Country focus / clear focus
- Debounce rapid commits: **300ms** trailing max (single constant in `constants/geo.ts`)

---

## UI (`map-discovery-hint.tsx`)

Minimal pill above FAB or below region chrome:

- Visible when: `viewportCountryCount > 0` && presentation mode !== `preview`
- Copy: `{n} countries in view`
- No button in this step — count only proves wiring

Use NativeWind + StyleSheet per AGENTS.md exceptions.

---

## Optional stretch (ask user first)

- `expo-location` for device lat/lng → `"Near me"` seed on first Map open
- Out of default scope — skip unless approved

---

## Out of scope

- Changing Explore feed
- Backend `/discover`
- FAB / shuffle pool changes

---

## Acceptance criteria

- [ ] Pan map to Europe → after settle, `viewportCountryCount > 0` and names plausible
- [ ] World zoom → count 0 or hidden hint
- [ ] Country focus → tier `country`; scope records `activeCountryName`
- [ ] Preview open → hint hidden
- [ ] 2D and 3D both commit scope (same store)
- [ ] No query storm during continuous drag (debounced)
- [ ] `npm run lint` and `npm run typecheck` pass

---

## Testing

```bash
# Terminal 1 — backend + Redis
# Terminal 2
npx expo start
```

1. Map → zoom to continent → wait for settle → hint shows count
2. Toggle 2D ↔ 3D → repeat
3. Focus country → tier updates; hint behavior documented
4. Open preview → hint hidden

---

## Next step

[`15c-viewport-driven-explore.md`](./15c-viewport-driven-explore.md) — **Explore this area** + **Here** feed mode.
