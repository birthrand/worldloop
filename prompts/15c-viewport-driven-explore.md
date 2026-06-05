Read AGENTS.md first and follow it strictly.

Parent: [`15-geo-aware-discovery-overview.md`](./15-geo-aware-discovery-overview.md) · Previous: [`15b-spatial-context-and-viewport-query.md`](./15b-spatial-context-and-viewport-query.md) · Next: [`15d-map-explore-sync.md`](./15d-map-explore-sync.md)

## Step 3 — Viewport-driven Explore

**Goal:** Let users open Explore filtered to **what’s on the map right now** — **Here** mode — via **Explore this area** on the Map tab.

This is the first user-visible “geo-aware discovery layer” moment.

---

## Problem

- Explore feed is global **For You** or manual **region chip** — not viewport-driven
- `useSpatialContextStore.viewportCountries` is computed but unused by feed
- Map and Explore feel like separate apps

---

## Prerequisites

- [`15b-spatial-context-and-viewport-query.md`](./15b-spatial-context-and-viewport-query.md) **completed**
- [`10a-explore-ui.md`](./10a-explore-ui.md) — vertical feed works
- `store/use-country-feed-store.ts` — region filter + `focusCountryInFeed` exist

---

## Product behavior

| Mode       | Source                        | Feed contents                                                           |
| ---------- | ----------------------------- | ----------------------------------------------------------------------- |
| **forYou** | Default Explore tab           | Paginated `GET /feed/countries` (unchanged)                             |
| **region** | Explore header chips / search | `GET /search?region=…` (unchanged)                                      |
| **here**   | Map → **Explore this area**   | Countries from `viewportCountries`, enriched via existing fetch helpers |

**Here mode rules**

1. Order matches spatial rank (viewport center nearest first)
2. `nextCursor: null` — bounded list (no infinite scroll unless pool > page size; paginate locally if > 30)
3. Explore header shows: **Here · {Region or “Map area”} · {n} countries**
4. Leaving Here mode: user taps **For You** chip or clears via header — restores `forYouSnapshot`

---

## Files to add

| Path                                      | Purpose                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `lib/load-countries-for-discovery.ts`     | Map `GeoEntity[]` → `Country[]` via `fetchCountryByName` / batch with SWR      |
| `components/map/map-discovery-chrome.tsx` | Hint + **Explore this area** button (replaces or extends `map-discovery-hint`) |

## Files to change

| Path                                     | Change                                                            |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `store/use-country-feed-store.ts`        | Add `discoveryMode`, `loadHereFeed(scope)`, `restoreForYouFeed()` |
| `store/use-spatial-context-store.ts`     | On Here entry: set `discoveryScope.mode = "here"`                 |
| `components/explore/explore-top-bar.tsx` | Show Here / For You / region state; exit Here                     |
| `app/(tabs)/map.tsx`                     | Wire `MapDiscoveryChrome` CTA → `openExploreHere()`               |
| `lib/open-country-in-explore.ts`         | Optional: accept `{ mode: "here" }` to preserve scope             |

---

## Feed store extensions

```ts
import type { DiscoveryScopeMode, GeoEntity } from "@/types/geo";

// New state
discoveryMode: DiscoveryScopeMode;

// New actions
loadHereFeed: (entities: GeoEntity[]) => Promise<void>;
setDiscoveryMode: (mode: DiscoveryScopeMode) => void;
restoreForYouFeed: () => void;
```

**`loadHereFeed`**

1. Dedupe by `cca2` / name
2. For each entity, resolve full `Country` (cache-first via `client-cache` + `fetchCountryByName`)
3. Show partial list immediately if cached; background enrich missing AI/images
4. Set `countries`, `currentIndex: 0`, `selectedRegion: null`, `discoveryMode: "here"`
5. Do **not** overwrite `forYouSnapshot` — keep for restore

**Loading UX**

- Map CTA → `router.push("/(tabs)/explore")` after first cached country available OR short spinner on Explore

---

## Map chrome (`map-discovery-chrome.tsx`)

Replace count-only hint from Step 2 when `viewportCountryCount > 0`:

```txt
┌─────────────────────────────────────┐
│  24 countries in view               │
│  [ Explore this area → ]            │
└─────────────────────────────────────┘
```

- Position: above FAB stack; respect safe area + region chrome
- Hidden when preview open or tier === `world`
- Disabled when `viewportCountryCount === 0`
- Haptic on press

---

## Explore header

When `discoveryMode === "here"`:

- Active tab/chip: **Here**
- Subtitle: `{n} countries from your map`
- Tapping **For You** calls `restoreForYouFeed()`

Do not redesign header visuals — wire state only.

---

## Out of scope

- Swiping feed updates map camera (Step 4)
- Spatial FAB / shuffle (Step 4)
- Backend `/discover`

---

## Acceptance criteria

- [ ] Map continent view → **Explore this area** → Explore opens with countries from viewport
- [ ] Order feels geographic (center country first)
- [ ] **For You** restores previous global feed
- [ ] Here mode survives tab switch Explore → Map → Explore (scope persisted in store)
- [ ] Empty viewport → CTA hidden/disabled
- [ ] Preview open → chrome hidden
- [ ] `npm run lint` and `npm run typecheck` pass

---

## Testing

1. Map → Asia → settle → tap **Explore this area**
2. Verify first countries are Asian; swipe works
3. Header → **For You** → global feed returns
4. Search pick country → Explore still works (regression)
5. Kill network mid-load → cached countries still show where possible

---

## Next step

[`15d-map-explore-sync.md`](./15d-map-explore-sync.md) — shared queue, spatial FAB, bidirectional handoff.
