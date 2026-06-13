# Explore swipe deck — image prefetch & instant swipes

Read `AGENTS.md` first. This doc describes the **implemented** swipe-card Explore feed: how cards are mounted, how hero images are warmed, and why the UX should feel instant on forward swipes.

Related prompts:

- `prompts/10a-explore-ui.md` — original vertical Explore feed (superseded by swipe deck on this branch)
- `prompts-worldloop/03-image-service.md` — backend image sourcing
- `prompts-worldloop/05-feed-endpoint.md` — paginated country feed

---

## Product goal

Users swipe through countries like a deck of cards. The bottleneck is **not** React mounting — it is **hero image readiness**.

Target experience:

```text
Launch → skeleton → feed ready → forward swipes feel instant (no skeleton flash)
```

A skeleton **during active swiping** reads as “loading again” and feels slower than the app actually is.

---

## Architecture overview

```text
ExploreScreen
  └── ExploreFeed
        └── ExploreSwipeDeck          ← stack + gestures
              ├── SwipeableTopCard    ← current country (interactive)
              └── ExploreSwipeCard    ← next country (mounted behind, non-interactive)
```

### What is mounted vs cached

| Layer                  | Strategy                                      | Cost                                              |
| ---------------------- | --------------------------------------------- | ------------------------------------------------- |
| **Next card UI**       | Pre-mounted (`EXPLORE_SWIPE_STACK_DEPTH = 1`) | Medium — pager, layout, gestures                  |
| **Future hero images** | Cached only (`currentIndex` … `+3`)           | Low — disk/memory, no extra mounts                |
| **Previous card**      | Not pre-mounted                               | Back-swipe may remount (acceptable for discovery) |
| **AI profiles**        | Prefetched ±1 / +2 around index               | Network — Wikipedia/landmarks for explorer        |

**Rule of thumb:** `1 mounted card ahead` + `3 heroes cached ahead` before increasing stack depth.

---

## Key constants

| Constant                    | File                                | Value | Meaning                           |
| --------------------------- | ----------------------------------- | ----- | --------------------------------- |
| `EXPLORE_SWIPE_STACK_DEPTH` | `constants/explore-swipe-layout.ts` | `1`   | One card behind the top card      |
| `FEED_HERO_PREFETCH_AHEAD`  | `lib/prefetch-feed-heroes.ts`       | `3`   | Hero URLs for index … index+3     |
| `FEED_HERO_PREFETCH_BEHIND` | `lib/prefetch-feed-heroes.ts`       | `1`   | Hero URL for index−1 (back swipe) |

---

## Image readiness pipeline

### 1. Card-level warming (all carousel images)

Every mounted `ExploreSwipeCard` prefetches **all** image URLs for that country:

```ts
// components/explore/explore-swipe-card.tsx
for (const uri of images) {
  void prefetchCountryImage(uri);
}
```

The back card in the stack runs this as soon as it mounts — so the **next** country’s hero often starts loading before the user swipes.

### 2. Rolling hero prefetch (index window)

`prefetchFeedHeroImagesAroundIndex(countries, aroundIndex)` warms **first hero only** for:

- `aroundIndex - 1` … `aroundIndex + 3`

Triggered from:

- `ExploreSwipeDeck` — `useEffect` when `currentIndex` or `countries` changes
- `use-country-feed-store` — after initial feed load, region switch, here feed, restore

```ts
// lib/prefetch-feed-heroes.ts
export async function prefetchFeedHeroImagesAroundIndex(
  countries: Country[],
  aroundIndex: number,
): Promise<void>;
```

Images are deduped by URL and stored via `prefetchCountryImage` → expo-image disk cache + in-memory `warmedUris` set in `components/explore/country-image.tsx`.

### 3. Swipe-begin warming (user intent)

When the user **starts** dragging the top card, `warmFeedHeroesOnSwipeBegin` runs:

1. Immediately prefetches the **next** country’s hero
2. Kicks off the full rolling window from `currentIndex + 1`

Wired in `ExploreSwipeDeck` → `SwipeableTopCard` → `Gesture.Pan().onBegin()`.

This gives ~200–400 ms of extra download time before the dismiss animation finishes.

### 4. Cache-aware skeleton skip

If the hero is already in `warmedUris`, the card skips the loading skeleton:

```ts
// components/explore/explore-swipe-card.tsx
const [isActiveHeroLoaded, setIsActiveHeroLoaded] = useState(() =>
  isCountryHeroReady(images),
);
```

While `!isActiveHeroLoaded`:

- Hero area shows `ImageLoadSkeleton` (shimmer)
- Footer shows `ExploreSwipeCardInfoSkeleton` (title / actions / fact placeholders)

When cached, real text and icons appear immediately with the hero.

---

## Direct navigation (search, home CTAs)

Swipe discovery and direct navigation are different UX patterns. Swipe benefits from stack pre-mount + rolling prefetch **before** exposure. Search used to warm the hero **after** navigation — the most likely place for skeleton flashes.

### Flow today

```text
Search result tapped
  → warmCountryHeroImage(country)     ← openCountryInExplore (earliest)
  → focusCountryInFeed(country)
      → warmCountryHeroImage(country) ← idempotent dedupe
      → set countries at index 0
      → prefetchCountryProfiles(..., { aroundIndex: 0 })
  → router.push Explore
  → deck/card mount (cache-aware skeleton skip)
```

**Do not** call `prefetchFeedHeroImagesAroundIndex` inside `focusCountryInFeed`. The target country is already known — warm its hero directly via `warmCountryHeroImage`.

| Entry path        | Hero warm                                     | Profile warm                   |
| ----------------- | --------------------------------------------- | ------------------------------ |
| Forward swipe     | Stack + rolling window + swipe-begin          | `handleIndexChange`            |
| Search / home CTA | `openCountryInExplore` + `focusCountryInFeed` | `focusCountryInFeed`           |
| Here queue focus  | `focusCountryInDiscoveryQueue`                | `focusCountryInDiscoveryQueue` |

Why search skeletons felt worse: users already waited for search + selection; a second shimmer reads as “the app isn’t ready for my choice.” Eager hero warm closes the gap between intent and paint.

---

## Other prefetch (not swipe UI)

| System                            | When                                 | Purpose                                |
| --------------------------------- | ------------------------------------ | -------------------------------------- |
| `prefetchCountryProfiles`         | On swipe index change + search focus | AI explorer / Wikipedia / landmarks    |
| `loadMoreFeed`                    | Within 2 cards of feed end           | Pagination — avoid “end of deck” stall |
| `prefetchFeedHeroImages` (legacy) | Region background warmup             | First 2 heroes of a region catalog     |

Profile prefetch does **not** replace hero prefetch — users see images first.

---

## File map

| File                                                      | Role                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `components/explore/explore-swipe-deck.tsx`               | Stack, gestures, rolling prefetch effect, swipe-begin warm |
| `components/explore/explore-swipe-card.tsx`               | Card UI, per-card image prefetch, skeleton gating          |
| `components/explore/country-image.tsx`                    | `prefetchCountryImage`, `isCountryImageReady`, shimmer     |
| `components/explore/explore-swipe-card-info-skeleton.tsx` | Footer placeholder while hero loads                        |
| `components/explore/skeleton-bone.tsx`                    | Shared pulse animation for skeletons                       |
| `lib/prefetch-feed-heroes.ts`                             | Rolling hero window + swipe-begin helper                   |
| `lib/open-country-in-explore.ts`                          | Earliest hero warm on search / home navigation             |
| `store/use-country-feed-store.ts`                         | `focusCountryInFeed` hero + profile warm; feed load        |
| `constants/explore-swipe-layout.ts`                       | `EXPLORE_SWIPE_STACK_DEPTH` and layout tokens              |

---

## Priority ranking (product)

Implemented:

1. **Rolling hero prefetch** — current … +3 heroes cached
2. **Prefetch on swipe begin** — next hero + window on drag start
3. **Skeleton flash reduction** — cache-aware `isActiveHeroLoaded`
4. **Search / direct navigation** — `warmCountryHeroImage` + profile prefetch in `focusCountryInFeed` and `openCountryInExplore`

Deferred (lower ROI for WorldLoop):

5. **Back-swipe optimization** — previous card not kept mounted
6. **Increase `EXPLORE_SWIPE_STACK_DEPTH`** — memory cost; prefer more hero cache first

---

## How to verify

1. Cold launch Explore — full-screen skeleton, then first card (expected once).
2. Swipe forward several times — heroes should appear without footer shimmer on most swipes.
3. Start dragging slowly before releasing — next hero should warm during the drag.
4. Fast swipe through 5+ cards — no “all caught up” until feed ends; no pagination stall near the end.
5. Swipe back (right) — may briefly shimmer if previous hero was evicted from cache (acceptable).
6. Search for a country not in the feed — hero should appear with minimal or no skeleton (slow network may still shimmer briefly).

### Debug tips

- Slow network (DevTools / Network Link Conditioner) exposes remaining skeleton flashes.
- If flashes persist on forward swipes, check whether `prefetchFeedHeroImagesAroundIndex` runs (deck `useEffect`) and whether the back card is mounted (`STACK_DEPTH >= 1`).

---

## Future improvements (optional)

- **Blurred placeholder** — show a tiny cached thumbnail or the back card’s hero under the top card during dismiss (no skeleton).
- **Priority queue** — prefetch `index+1` before `index+3` when bandwidth is limited.
- **Increase `FEED_HERO_PREFETCH_AHEAD`** to 4–5 for very fast swipers without raising stack depth.

Do not increase stack depth until hero cache misses are measured and still unacceptable.
