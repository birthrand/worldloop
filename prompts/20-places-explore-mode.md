Read AGENTS.md first and follow it strictly.

Reference: `prompts/10a-explore-ui.md`, `prompts/10f-explore-swipe-deck-prefetch.md`, `prompts/15c-viewport-driven-explore.md`, `prompts/16-ai-content-explorer-ui.md`, `prompts/19-static-country-profiles.md`, `prompts-worldloop/14-landmarks-data-pipeline.md`

Add a **Places** discovery mode to Explore — a chip/mode in the existing feed menu, not a second bottom tab.

## Goal

Let users swipe through **landmarks** (not countries) in the same vertical Explore deck, while keeping **country context** visible on every card.

Places is a **mode switch** like `forYou`, `here`, `region`, and `saved` — same tab, same gestures, different feed source and card content.

---

## Product decision

| Approach                                   | Verdict                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Second bottom tab (Countries \| Landmarks) | **No** — splits the TikTok loop, duplicates content, adds navigation complexity                   |
| Chip / mode in feed menu (`Places`)        | **Yes** — reuses `ExploreFeedMenuSheet`, `ExploreSwipeDeck`, and `forYouSnapshot` restore pattern |
| Landmarks only inside country profile      | Keep — profile remains the depth layer; Places is discovery                                       |

---

## Problem

- Landmarks exist in profiles (`CountryLandmarksSection`, `country-profiles.json`) but are only visible after opening country detail
- Onboarding promises “culture, landmarks, and history” — landmarks are not surfaced in the core swipe feed
- A separate landmark tab would require a parallel feed stack without matching the country-first architecture

---

## Prerequisites

- [`10a-explore-ui.md`](./10a-explore-ui.md) — vertical swipe deck works
- [`10f-explore-swipe-deck-prefetch.md`](./10f-explore-swipe-deck-prefetch.md) — hero prefetch + deck gestures
- [`15c-viewport-driven-explore.md`](./15c-viewport-driven-explore.md) — `discoveryMode`, `forYouSnapshot`, `loadSavedFeed` / `restoreForYouFeed` patterns
- [`19-static-country-profiles.md`](./19-static-country-profiles.md) — bundled landmarks in `data/country-profiles.json` (or live `GET /country/:name/profile`)
- `lib/country-profile-cache.ts` — profile SWR cache used when flattening landmarks

No new backend endpoint is required for v1 — landmarks are read from static profiles or the existing profile cache.

---

## Discovery modes (after implementation)

| Mode       | Source                       | Feed contents                                    |
| ---------- | ---------------------------- | ------------------------------------------------ |
| **forYou** | Default Explore tab          | Paginated countries (`GET /feed/countries`)      |
| **region** | Continent chip / search      | Countries in selected region                     |
| **here**   | Map → Explore this area      | Countries in `viewportCountries`                 |
| **saved**  | Saved chip                   | Bookmarked countries                             |
| **places** | **Places** chip in feed menu | Flattened landmarks from the active country pool |

### Places mode rules (v1)

1. Enter via **Places** row in `ExploreFeedMenuSheet` (hamburger menu) — not a new bottom tab
2. Snapshot `forYouSnapshot` on entry (same as `region` / `saved`) so **For You** restores the previous country feed
3. `nextCursor: null` — bounded list, no infinite scroll in v1
4. One landmark per swipe card (flattened queue)
5. Country pool for v1: current **For You** tail (or static catalog shuffle) — not scoped to region/here yet
6. Header label when active: **Places · {n} landmarks** (mirror `Here · Europe · 12 countries`)

---

## Data model

### `PlaceFeedItem`

```ts
import type { CountryLandmark } from "@/lib/api";
import type { Country } from "@/types/country";

export type PlaceFeedItem = {
  landmark: CountryLandmark;
  country: Country;
};
```

All card fields derive from `landmark` + `country` — no extra v1 fields.

### Extend `DiscoveryScopeMode`

```ts
// types/geo.ts
export type DiscoveryScopeMode =
  | "forYou"
  | "here"
  | "region"
  | "saved"
  | "places";
```

### Landmark source fields (`CountryLandmark`)

| Field         | On card (v1) | Notes                                     |
| ------------- | ------------ | ----------------------------------------- |
| `name`        | Title        | 1–2 lines                                 |
| `type`        | Subtitle     | e.g. `UNESCO World Heritage Site`         |
| `description` | Body         | `formatLandmarkDescription`, max 3 lines  |
| `imageUrl`    | Hero         | Blur-up load like profile `LandmarkImage` |
| `latitude`    | —            | Deferred — map pin action in v2           |
| `longitude`   | —            | Deferred                                  |
| `id`          | —            | Internal / feed key                       |
| `source`      | —            | Internal                                  |

---

## Places card spec

Same shell as `ExploreSwipeCard` — reuse `EXPLORE_SWIPE_CARD_INFO_REGION_HEIGHT` and typography tokens so the deck never jumps.

### Anatomy

```txt
┌─────────────────────────────────────┐
│                                     │
│         LANDMARK HERO IMAGE         │  ← full bleed, same ratio as country card
│                              [flag] │  ← small country flag (corner)
│                                     │
├─────────────────────────────────────┤
│  Buddhas of Bamiyan            [♡]  │  ← landmark name + save (parent country)
│  UNESCO World Heritage · Afghanistan│  ← type · country
│                                     │
│  About                              │  ← eyebrow (replaces "Did you know")
│  Sculptures in Afghanistan before   │  ← description, max 3 lines
│  2001...                            │
└─────────────────────────────────────┘
```

### Zone-by-zone

#### Hero (top region)

| Priority | Source                   | Fallback behavior                            |
| -------- | ------------------------ | -------------------------------------------- |
| 1        | `landmark.imageUrl`      | `LandmarkImage` blur-up from profile section |
| 2        | `country.images[0]`      | When landmark has no Wikimedia image         |
| 3        | `images.earthTopography` | Same as profile landmarks placeholder        |

- **v1: single image** — no horizontal carousel (one landmark = one card = one photo)
- **Flag overlay:** `FlagBadge` with `country.flag` + `country.cca2` in hero corner (same role as `HeroImagePager`)

#### Title row

| Element  | Value              | Behavior                                              |
| -------- | ------------------ | ----------------------------------------------------- |
| Title    | `landmark.name`    | `EXPLORE_SWIPE_CARD_TITLE_MAX_LINES`                  |
| Bookmark | Parent **country** | `toggleSaved(country)` — no landmark-level save in v1 |

#### Subtitle

Format: `{landmark.type} · {country.name}`

Examples:

- `UNESCO World Heritage Site · Afghanistan`
- `Monument · France`

Do **not** show capital, population, or continent on the Places card subtitle in v1.

#### Body (fact slot)

| Country card              | Places card                                        |
| ------------------------- | -------------------------------------------------- |
| Eyebrow: **Did you know** | Eyebrow: **About**                                 |
| Body: AI fact             | Body: `formatLandmarkDescription(description)`     |
| Max lines: 3              | Max lines: 3 (`EXPLORE_SWIPE_CARD_FACT_MAX_LINES`) |

**Description fallback chain** (when empty or very short):

1. `landmark.description` (trimmed)
2. `{type} in {country.name}` — e.g. _Historic city ruins in Bamyan, Afghanistan_
3. _Discover more in {country.name}_ (generic last resort)

Do **not** use country `ai.fact` on the Places card — it describes the country, not the place.

### Country vs Places comparison

| Zone     | Country card              | Places card             |
| -------- | ------------------------- | ----------------------- |
| Hero     | Country images + carousel | Landmark image (single) |
| Title    | Country name              | Landmark name           |
| Subtitle | Region · capital          | Type · country          |
| Eyebrow  | Did you know              | About                   |
| Body     | AI fact                   | Landmark description    |
| Save     | Country                   | Country (parent)        |
| Tap      | Country detail            | Country detail          |

### Interactions (v1)

| Action           | Behavior                                          |
| ---------------- | ------------------------------------------------- |
| Tap card / fact  | `openCountryDetail(country, { from: "explore" })` |
| Bookmark         | Save / unsave parent country                      |
| Vertical swipe   | Next / previous `PlaceFeedItem` in queue          |
| Horizontal swipe | Disabled (single hero image)                      |

**Deferred (v2):** “Show on map” when `latitude` and `longitude` are present.

---

## Feed store extensions

### New state (`use-country-feed-store.ts`)

```ts
places: PlaceFeedItem[];
placesFeedGeneration: number; // module-level guard, like hereFeedGeneration
```

### New action

```ts
loadPlacesFeed: () => Promise<void>;
```

### `loadPlacesFeed` behavior

1. Increment `placesFeedGeneration`; call `snapshotForYouIfNeeded()`
2. Set `{ discoveryMode: "places", status: "loading", places: [], currentIndex: 0 }`
3. Resolve country pool from For You tail / static catalog (same helpers as feed bootstrap)
4. For each country, read landmarks from:
   - `getStaticCountryProfileByName(name)` when static catalog enabled
   - else `getCountryProfileFromCache` / `prefetchCountryProfile`
5. Flatten to `PlaceFeedItem[]` — one entry per landmark
6. Filter out landmarks with no usable name; prefer landmarks with `imageUrl` first (optional ranking)
7. Shuffle or keep country-pool order (start with shuffle for variety)
8. Set `{ places, status: "idle", nextCursor: null }`

### Leaving Places

- User taps **For You** in feed menu → `restoreForYouFeed()` (existing)
- `discoveryMode` returns to `"forYou"`; `places` can be cleared or retained for fast re-entry

---

## Files to add

| Path                                              | Purpose                                            |
| ------------------------------------------------- | -------------------------------------------------- |
| `types/place-feed.ts`                             | `PlaceFeedItem` type                               |
| `lib/flatten-landmarks-for-feed.ts`               | Country pool → `PlaceFeedItem[]` via profile cache |
| `components/explore/explore-swipe-place-card.tsx` | Places variant of swipe card                       |

## Files to change

| Path                                             | Change                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `types/geo.ts`                                   | Add `"places"` to `DiscoveryScopeMode`                            |
| `constants/regions.ts`                           | `PLACES_TAB = "Places"`; extend `ExploreHeaderTab`                |
| `store/use-country-feed-store.ts`                | `places`, `loadPlacesFeed`, generation guard, restore integration |
| `components/explore/explore-feed-menu-sheet.tsx` | Places menu row + `selectedTab` when `discoveryMode === "places"` |
| `components/explore/explore-swipe-deck.tsx`      | Branch: country deck vs places deck                               |
| `components/explore/explore-feed.tsx`            | Empty / error / loading copy for Places mode                      |
| `app/(tabs)/explore.tsx`                         | Initial load guard when `discoveryMode === "places"`              |

---

## Empty and error states

| State                      | Copy / behavior                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------- |
| No landmarks in pool       | _No places found yet — try For You or browse another region_ + **Browse For You** CTA |
| Profile load failure       | Skip country; continue flattening others; show error only if `places.length === 0`    |
| Card loading               | Skeleton card (gray hero + title bones)                                               |
| Weak / missing description | Use fallback chain above                                                              |

---

## v1 scope

**In scope**

- Places chip in feed menu
- Flattened landmark queue from For You country pool
- `ExploreSwipePlaceCard` per spec above
- Save parent country from Places card
- Tap → country detail
- `forYouSnapshot` restore
- Static profile + API profile cache as landmark source

**Out of scope (defer)**

- Per-landmark save / bookmark
- `GET /feed/landmarks` backend endpoint
- Places + region / Places + here scoping
- Map pin CTA on card
- Per-landmark AI facts
- Horizontal carousel on place card
- Infinite scroll in Places mode
- Second bottom tab

---

## Future enhancements (v2+)

| Enhancement      | Notes                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Places + region  | Landmarks only from countries in active continent chip             |
| Places + here    | Filter by landmark `lat`/`lng` inside map bbox                     |
| Places + saved   | Landmarks from saved countries only                                |
| Map focus        | `focusLandmarkOnMap(item)` when coordinates exist                  |
| Detail deep link | Open country detail scrolled to matching landmark row              |
| Backend feed     | `GET /feed/places` with global ranking when client flatten is slow |

---

## Test plan

- [ ] Open Explore → feed menu → **Places** — deck shows landmark cards, not countries
- [ ] Card shows: landmark hero, flag overlay, name, type · country, About + description
- [ ] Bookmark saves parent country; appears on Saved tab
- [ ] Tap card opens country detail with landmarks section populated
- [ ] Vertical swipe advances through flattened landmarks
- [ ] Tap **For You** restores previous country feed and index snapshot
- [ ] Empty state when no landmarks resolve from pool
- [ ] Works offline when `country-profiles.json` is bundled and static catalog enabled
- [ ] Hero fallback when `imageUrl` is null (country image → topography)
- [ ] Description fallback when `description` is empty
- [ ] `npm run lint` and `npm run typecheck` pass

---

## Usage in Cursor

```text
@prompts/20-places-explore-mode.md implement it
```
