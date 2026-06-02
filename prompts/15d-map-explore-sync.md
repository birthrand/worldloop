Read AGENTS.md first and follow it strictly.

Parent: [`15-geo-aware-discovery-overview.md`](./15-geo-aware-discovery-overview.md) · Previous: [`15c-viewport-driven-explore.md`](./15c-viewport-driven-explore.md) · Next: [`15e-geo-progress-passport-layer.md`](./15e-geo-progress-passport-layer.md)

## Step 4 — Map ↔ Explore sync & spatial pools

**Goal:** Unify **discovery queue** across Map and Explore, and make **Random FAB / shuffle** prefer the **current spatial pool** when a viewport scope is active.

---

## Problem

- `focusCountryInFeed` prepends one country — no shared ordered queue with map
- `map-random-pick.ts` uses region/world pools, not viewport bbox
- Swiping Explore does not update map focus (optional but teachable)
- External entry (search, Home) drops spatial context

---

## Prerequisites

- [`15c-viewport-driven-explore.md`](./15c-viewport-driven-explore.md) **completed**
- [`13d-map-v3-ui-ux-upgrade.md`](./13d-map-v3-ui-ux-upgrade.md) — focus-first FAB behavior

---

## Shared discovery queue

Add to `use-spatial-context-store.ts` (or dedicated `use-discovery-queue-store.ts` if cleaner):

```ts
type DiscoveryQueueState = {
  /** Ordered country names — source of truth for Here + spatial shuffle. */
  queue: string[];
  queueSource: "viewport" | "region" | "forYou" | "manual";

  setQueueFromViewport: (entities: GeoEntity[]) => void;
  setQueueFromCountries: (
    countries: Country[],
    source: DiscoveryQueueState["queueSource"],
  ) => void;
  advanceQueue: (currentName: string) => string | null; // next name
};
```

**Rules**

- When `commitScope` updates viewport → refresh queue from ranked entities
- When **Explore this area** fires → same queue order as feed
- When user swipes Explore in Here mode → optional: `focusCountryOnMap(next, source: "explore")` without opening preview (light sync — implement if performant)

---

## Spatial random pick

Extend `lib/map-random-pick.ts`:

```ts
export function buildSpatialDiscoveryPool(input: {
  viewportCountries: GeoEntity[];
  focusedRegion: string | null;
  allCountries: MapCountry[];
  visitedNames?: Set<string>;
  preferUnvisited?: boolean;
}): MapCountry[];
```

**FAB / shuffle priority**

1. If `viewportCountries.length > 0` && tier !== `world` → pool = viewport (map to `MapCountry`)
2. Else if `focusedRegion` → existing region pool
3. Else → world pool

**Prefer unvisited:** when `useDiscoveryProgressStore` has visited set (Step 5), filter pool — fallback to full pool if empty.

Wire in `hooks/use-map-logic.ts` for FAB and preview shuffle.

---

## Handoff improvements

### Map → Explore

`lib/open-country-in-explore.ts`:

```ts
openCountryInExplore(country, options?: {
  mode?: "forYou" | "here";
  preserveQueue?: boolean;
});
```

- If `mode: "here"` and queue exists → focus index of country in queue, don’t rebuild feed

### Explore → Map

`lib/open-country-on-map.ts`:

- Pass `discoveryScope` snapshot on `pendingMapIntent` metadata (extend `MapPresentationIntent` if needed)
- Map flight uses existing focus-first flow

### Search / Home → Map or Explore

- Search pick → focus country; **do not** force Here mode (regression guard)
- Optionally commit scope at country tier after external focus

---

## Explore swipe → map focus (optional stretch)

When `discoveryMode === "here"` and user swipes to new country:

- Debounced `focusCountryOnMap(country, "explore", { animate: false })` if Map tab not visible — skip if costly
- **Must not** open preview
- Skip if user disabled in dev flags

Mark optional in implementation; acceptance criteria below do not require it.

---

## Files to add / change

| Path                                  | Change                         |
| ------------------------------------- | ------------------------------ |
| `store/use-spatial-context-store.ts`  | Queue state + actions          |
| `lib/map-random-pick.ts`              | Spatial pool builder           |
| `hooks/use-map-logic.ts`              | FAB/shuffle use spatial pool   |
| `lib/open-country-in-explore.ts`      | Queue-aware handoff            |
| `lib/open-country-on-map.ts`          | Scope snapshot on intent       |
| `types/map-presentation.ts`           | Optional `scopeMode` on intent |
| `components/explore/explore-feed.tsx` | Optional swipe → map sync      |

---

## Out of scope

- Backend `/discover`
- Visited styling (Step 5)
- Deep links

---

## Acceptance criteria

- [ ] FAB at continent zoom picks from viewport pool (not random world country)
- [ ] Shuffle in preview (when scope active) advances within viewport/region pool
- [ ] **Explore this area** feed order matches `discoveryQueue`
- [ ] Search → Explore still works; does not force Here mode
- [ ] Map → Explore → Map on same country preserves focus
- [ ] 2D / 3D parity for FAB pool
- [ ] `npm run lint` and `npm run typecheck` pass

---

## Testing

1. Map Asia → FAB repeatedly → countries stay in Asia
2. Open Here feed → order matches map queue
3. Shuffle inside preview → stays in scope
4. World zoom → FAB uses world pool (regression)
5. Search Brazil → Explore → Map → focus correct

---

## Next step

[`15e-geo-progress-passport-layer.md`](./15e-geo-progress-passport-layer.md) — visited map layer + honest Home progress.
