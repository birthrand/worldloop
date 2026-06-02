Read AGENTS.md first and follow it strictly.

Parent: [`15-geo-aware-discovery-overview.md`](./15-geo-aware-discovery-overview.md) · Previous: [`15d-map-explore-sync.md`](./15d-map-explore-sync.md) · Next: [`../prompts-worldloop/12-discover-endpoint.md`](../prompts-worldloop/12-discover-endpoint.md)

## Step 5 — Geo progress & passport layer

**Goal:** Replace **mock** discovery stats with **real geographic progress**, and show **visited countries** on the map — making Home honest and the globe a personal passport.

---

## Problem

- `use-discovery-progress-store.ts` hardcodes `streakDays: 12`, `countriesExplored: 28`, etc.
- `recordView` in `use-recently-viewed-store.ts` tracks recents but **not** unique exploration or map styling
- Home `HomeStatsRow` displays fake achievement data

---

## Prerequisites

- [`15d-map-explore-sync.md`](./15d-map-explore-sync.md) **completed** (spatial pools + queue)
- [`10b-home-ui.md`](./10b-home-ui.md) — `HomeStatsRow` exists
- Country focus fill layers exist (`globe-country-focus-layers`, `map-country-focus-layers`)

---

## Discovery progress store (rewrite behavior, keep shape)

Replace static initial state with computed + event-driven updates.

```ts
type DiscoveryProgressState = {
  /** Unique country ids (prefer cca2). */
  visitedCountryIds: string[];
  visitedAtByCountryId: Record<string, number>;
  lastActiveDate: string | null; // YYYY-MM-DD local
  streakDays: number;
  weekProgress: WeekProgress;
  countriesExplored: number; // derived: visitedCountryIds.length
  worldProgressPercent: number; // derived: round(count / WORLD_COUNTRY_COUNT * 100)
  quizzesCompleted: number; // keep 0 until quiz feature exists

  recordCountryVisit: (country: Pick<Country, "name" | "cca2">) => void;
  recordAppOpen: () => void; // streak tick
  resetProgress: () => void; // dev only
};
```

**`recordCountryVisit`**

- Call from `recordView` paths: `open-country-in-explore`, `open-country-on-map`, Explore swipe (`onViewableItemsChanged` — first time country fills >50% viewport)
- Dedupe by `cca2`
- Recompute `countriesExplored`, `worldProgressPercent`
- Update streak if new calendar day with visit

**Quizzes / streak UI**

- `quizzesCompleted`: show `0` or hide MiniStatCard until quiz prompt exists
- Week dots: real completion from `recordAppOpen` + visit on that day

Remove hardcoded seed values (`12`, `28`, `56`).

---

## Passport map layer

**Visited visual** — distinct from **focused** and **selected**:

| State   | Globe / 2D                                                              |
| ------- | ----------------------------------------------------------------------- |
| Default | Standard pin / boundary                                                 |
| Visited | Subtle green/teal ring or dimmer fill (design: match dark+gold palette) |
| Focused | Existing gold focus                                                     |
| Preview | Existing preview chrome                                                 |

### Files to change

| Path                                            | Change                                              |
| ----------------------------------------------- | --------------------------------------------------- |
| `components/map/globe-country-pin.tsx`          | Visited ring when `cca2` in visited set             |
| `components/map/globe-country-focus-layers.tsx` | Optional visited fill opacity                       |
| `components/map/map-country-marker.tsx`         | 2D visited badge                                    |
| `constants/map-country-focus.ts`                | Visited style tokens (if needed)                    |
| `hooks/use-map-logic.ts`                        | Call `recordCountryVisit` on meaningful view events |

**Do not** clutter world zoom — visited styling only at continent+ tier or on focused neighbors.

---

## Home honesty

| Path                                 | Change                                         |
| ------------------------------------ | ---------------------------------------------- |
| `components/home/home-stats-row.tsx` | Read derived stats; hide quiz card if 0        |
| `app/dev.tsx`                        | Reset progress button; seed visits for testing |

First-time user sees **0 countries, 0% world, 0-day streak** (honest).

---

## Spatial FAB: prefer unvisited

In `lib/map-random-pick.ts` (from Step 4):

- When `preferUnvisited: true`, filter viewport pool to unvisited
- Fallback to full pool if all visited

---

## Optional stretch

- **Region breakdown** on Home: “Asia 4/48 explored” from visited + geo index
- **Passport sheet** modal listing visited countries with dates

Skip unless user approves — not required for acceptance.

---

## Out of scope

- Quizzes content
- Backend sync of progress (local-only for now)
- Clerk user accounts linking progress

---

## Acceptance criteria

- [ ] Fresh install → Home shows 0 explored / 0% world
- [ ] View country in Explore → count increments once (not on repeat views same session)
- [ ] Visited country visually distinct on map at continent zoom
- [ ] Streak increments on day with ≥1 new visit or app open (document rule in code)
- [ ] FAB prefers unvisited in viewport when available
- [ ] Dev reset clears visited + stats
- [ ] `npm run lint` and `npm run typecheck` pass

---

## Testing

1. Clear AsyncStorage / dev reset → Home zeros
2. Explore 3 new countries → Home shows 3, world % ≈ 2%
3. Map → visited pin styling visible
4. FAB in Asia with many unvisited → picks unvisited
5. Re-view same country → count unchanged

---

## Next step

[`../prompts-worldloop/12-discover-endpoint.md`](../prompts-worldloop/12-discover-endpoint.md) — server-side bbox discover + Redis cache (when client index is insufficient).

---

## Post v5 optional

- Deep links with bbox
- Pull-to-refresh on Map forcing scope recomputation
- Analytics: `discovery_scope_committed`, `country_visit_recorded`
