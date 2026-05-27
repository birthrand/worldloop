Read AGENTS.md first and follow it strictly.

Reference: `prompt_material/home-screen-ui.png` (search bar styling), `prompt_material/full-design-system.png`, `AGENTS.md` (app structure, data model), `prompts/08-zustand.md`, `prompts/09-bottom-tab-nav.md`, `prompts/10b-home-ui.md`, `prompts/10a-explore-ui.md`, `prompts-worldloop/06-search-and-explore.md`

Implement **Search as an overlay** on top of the current tab (Home or Explore), wired to `GET /search`. The user should never feel like they left the app for a separate “search app” — Home or Explore stays visible underneath (dimmed), then the overlay dismisses and they land on the chosen country in Explore.

Match the **dark immersive** visual language (midnight surfaces, gold accents, rounded cards, 8-point spacing). Reuse the Home search field and trending/recently-viewed row patterns inside the overlay panel. There is no separate search mockup.

## UX mental model (read this first)

Search is **not** a separate screen or product — it is a **temporary layer** and a **shortcut into the main country experience** (the TikTok-style Explore card).

When a user opens search, they expect:

> “I’m still in WorldLoop — just finding a country quickly.”

When they tap a result, they expect:

> “I chose Japan — the search layer goes away and I am **in** Japan now (hero, fact, carousel). I can keep swiping to discover more.”

They do **not** expect:

- A hard navigation jump to a new route that hides the tab bar and breaks context
- To land on Explore still showing whatever country was in the paginated feed before

Therefore:

- **Overlay, not stack push** — open/close search without leaving the current tab’s world
- **Text search** = find mode (partial name match, debounced)
- **Region chips** = browse mode (works with an empty text field)
- **Tap result** = dismiss overlay → Explore **focused on that country** (required)
- Do **not** replace the entire feed with search hits — inject/focus the one country and keep the rest of the feed for vertical swiping

## Goal

Let users find countries by **name** (partial match) and **region**, then open a result in the **correct** Explore feed position.

- Tap Home `HomeSearchBar` or Explore top-bar search → **open search overlay** (keyboard focused); current tab remains mounted underneath
- Type to search (debounced API calls); region chips for browse-by-region
- Results list: flag, name, capital, region, thumbnail
- Tap result → Explore shows **that** country immediately (`focusCountryInFeed` + scroll sync)
- Swipe up from there continues the normal feed (discovery does not stop)
- Loading, empty, and error states that do not crash the screen

## Prerequisites

- `prompts/10b-home-ui.md` — `HomeSearchBar` exists on `app/(tabs)/index.tsx`
- `prompts/10a-explore-ui.md` — Explore feed + `ExploreTopBar` search stub
- `prompts/08-zustand.md` — `types/country.ts`, `constants/api.ts`, feed + saved stores
- `prompts-worldloop/06-search-and-explore.md` — backend `GET /search` deployed and reachable from the device/emulator (`EXPO_PUBLIC_API_URL`)

## Dependencies

Use what is already installed:

- `expo-router`, `expo-image`
- `zustand`, `@react-native-async-storage/async-storage` (optional for recent searches only)
- `@expo/vector-icons`
- `react-native-safe-area-context`

Do **not** add React Query, axios, Algolia, or new navigation libraries without user approval.

## Backend contract (already implemented)

```
GET /search?query=<string>&region=<string>
```

| Case | Behavior |
| ---- | -------- |
| `query=jap` | Partial, case-insensitive name match (e.g. Japan) |
| `region=Europe` | All countries in that region (case-insensitive) |
| Both set | Intersection of name + region filters |
| Neither set | `400` — `INVALID_SEARCH` |

Response shape:

```ts
type SearchResponse = {
  data: Country[];
  meta: {
    query: string | null;
    region: string | null;
    count: number;
  };
};
```

`Country` matches `types/country.ts` (same as feed). Search returns **enriched** countries (images + `ai`) — pass the object through to the feed; no second fetch on tap.

## Route & files

| Path | Purpose |
| ---- | ------- |
| `components/search/search-overlay.tsx` | Full-screen overlay UI (scrim + search panel + results) |
| `store/use-search-ui-store.ts` | `isOpen`, `openSearch()`, `closeSearch()` — tiny Zustand store |
| `app/(tabs)/_layout.tsx` | Mount `<SearchOverlay />` once so Home and Explore can open it |
| `lib/api.ts` | Add `fetchSearchCountries(query?, region?)` |
| `store/use-country-feed-store.ts` | Add `focusCountryInFeed(country)` (see below) |
| `lib/open-country-in-explore.ts` | `closeSearch()` → `focusCountryInFeed` → navigate to Explore |
| `components/explore/explore-feed.tsx` | Sync `FlatList` scroll when `currentIndex` changes programmatically |
| `components/search/` (optional) | Split overlay into `SearchInput`, `RegionChips`, `SearchResultRow`, `SearchEmptyState` |
| `components/home/home-search-bar.tsx` | Replace Alert stub → `openSearch()` |
| `components/explore/explore-top-bar.tsx` | Replace `console.log` → `openSearch()` |

**Do not** add `app/search.tsx` as a stack route for v1 — that breaks tab context and feels like leaving the immersive app.

Keep fetch/debounce logic in the overlay or a small hook under `hooks/`; do not put API calls inside presentational row components.

### Overlay architecture (required)

```
(tabs)/_layout.tsx
  ├── Tabs (Home | Explore | …)
  └── SearchOverlay  ← visible when useSearchUiStore.isOpen
        ├── Pressable scrim (dimmed, tap to dismiss)
        └── Panel (search input, chips, results FlatList)
```

Use React Native **`Modal`** with `transparent`, `animationType="fade"` (or slide from top), **or** an absolutely positioned full-screen `View` with high `zIndex` in `(tabs)/_layout.tsx`. `Modal` is fine per `AGENTS.md` style exceptions.

Mounting in `(tabs)/_layout.tsx` keeps the overlay available on **Home and Explore** without registering a root stack screen.

## Search → Explore (core UX — required)

### `focusCountryInFeed` in `useCountryFeedStore`

Add a single action used whenever opening a country from Search, Home trending, or Country of the Day:

```ts
focusCountryInFeed: (country: Country) => void;
```

**Algorithm:**

1. If `country.name` already exists in `countries` → `setCurrentIndex(existingIndex)`.
2. Else → **prepend** `country` to `countries`, then `setCurrentIndex(0)`.
3. Never duplicate by `name`.

**Why prepend at index 0?** The user explicitly chose that country; they should see it first. Swipe up continues the rest of the feed. Do not replace the whole feed with search results.

**Pagination:** Do not reset `nextCursor`. `loadMoreFeed` still appends at the end.

**Dedupe on load more (recommended):** When appending feed pages, filter out countries whose `name` is already in `countries` (avoids Japan appearing twice if it was prepended from search and later appears in a feed page).

**Empty feed:** If `countries.length === 0`, set `countries: [country]` and `currentIndex: 0`. Ensure `loadInitialFeed` on Explore does not wipe a non-empty list (skip initial load when countries already exist, or merge safely).

### `openCountryInExplore`

Update `lib/open-country-in-explore.ts`:

```ts
useSearchUiStore.getState().closeSearch();
focusCountryInFeed(country);
recordView(country);
router.push("/(tabs)/explore");
```

Remove the old `findIndex`-only logic — focus must work when the country is **not** in the current feed batch.

If the user was already on Explore when they searched, closing the overlay + `focusCountryInFeed` is enough; `router.push` to the same tab is harmless.

### `FlatList` scroll sync in `ExploreFeed`

`initialScrollIndex` only applies on first mount. Bottom tabs keep Explore mounted, so changing `currentIndex` in Zustand alone will **not** scroll the list.

In `components/explore/explore-feed.tsx`:

- Hold a `ref` on the vertical `FlatList`
- `useEffect` when `currentIndex` or `countries` change: call `scrollToIndex({ index: currentIndex, animated: false })` when the list is laid out
- Handle `onScrollToIndexFailed` (retry after layout / `requestAnimationFrame`) — common RN pattern

Without this, search → Explore can show the wrong country on screen even when the store index is correct.

## API helper (`lib/api.ts`)

Add:

```ts
export type SearchCountriesResponse = {
  data: Country[];
  meta: {
    query: string | null;
    region: string | null;
    count: number;
  };
};

export async function fetchSearchCountries(
  query?: string,
  region?: string,
): Promise<SearchCountriesResponse> {
  const url = new URL(`${API_BASE_URL}/search`);
  const q = query?.trim() ?? "";
  const r = region?.trim() ?? "";

  if (!q && !r) {
    throw new Error("At least one of query or region is required");
  }

  if (q) url.searchParams.set("query", q);
  if (r) url.searchParams.set("region", r);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Search request failed (${response.status})`);
  }
  return response.json() as Promise<SearchCountriesResponse>;
}
```

Do not call the API with both params empty — the backend returns `400`.

## Search overlay UX

### Shell (layered, not a new route)

| Layer | Spec |
| ----- | ---- |
| **Scrim** | Full-screen `rgba(0,0,0,0.6)` (or similar) over the **current tab** — user still senses Home/Explore underneath |
| **Dismiss scrim** | Tap outside panel closes overlay (`closeSearch()`) |
| **Panel** | Occupies most of the screen (e.g. top ~92% or full height with safe area) — `bg-midnight-navy` / `#121212`, rounded top corners optional (`rounded-t-3xl`) for sheet-like feel |
| **Safe area** | Respect top inset for input; bottom padding so results clear home indicator |
| **Tab bar** | Stays mounted; may be covered by scrim — do not navigate away from `(tabs)` |

Top row inside panel:

- **Cancel** or ✕ on the left (not `router.back()` — there is no search route)
- Optional muted title **Search** centered or omit title for a cleaner look

**Android hardware back:** closes overlay when open (`Modal onRequestClose` or `BackHandler`).

### Open / close behavior

| Action | Behavior |
| ------ | -------- |
| `openSearch()` | `isOpen: true`, focus `TextInput` after short delay (Modal mount) |
| Cancel / ✕ / scrim / back | `closeSearch()`, clear transient error if desired (optional: keep last query for next open) |
| Result tap | `closeSearch()` then `openCountryInExplore(country)` |

### Search input

Reuse the Home search field look:

- Rounded `bg-white/8` container, magnifying glass, placeholder `Search countries, regions, cultures…`
- `TextInput` with `autoFocus`, `autoCorrect={false}`, `autoCapitalize="none"`, `returnKeyType="search"`
- Clear (×) button when text is non-empty
- **Debounce** input by ~300ms before calling the API (teachable `useEffect` + timer — no lodash)
- Results update as the user types (submit key flushes debounce immediately)

### Region filter chips (horizontal scroll)

Use REST Countries region names consistent with feed data:

`Africa`, `Americas`, `Asia`, `Europe`, `Oceania`

- Single-select: tapping an active chip clears the region filter; tapping inactive sets region and triggers search
- Chip style: pill, muted border when idle, gold border/text when selected (`text-tab-active`)
- Region-only search is valid — call API even when the text field is empty if a region is selected (browse mode)

### When to search

| User action | API call |
| ----------- | -------- |
| Debounced text ≥ 1 character | `fetchSearchCountries(query, selectedRegion)` |
| Region chip toggled | Same, using current text + region |
| Submit / search key | Immediate search (flush debounce) |
| Overlay opens, no text, no region | **Do not** call API — show idle state (see below) |

### Idle state (no query, no region)

Before the user types or picks a region:

- Short helper copy: e.g. `Search by country name or pick a region`
- Show region chips (no spinner)
- Optional v1: **Recent searches** — last 5–8 strings in AsyncStorage; tap re-runs search

### Results list

- `FlatList` of rows (vertical), scannable at a glance
- Each row:

| Element | Source |
| ------- | ------ |
| Thumbnail | `getCountryImages(country)[0]` or neutral placeholder |
| Flag + name | `FlagBadge` + bold white name |
| Subtitle | `{capital} · {region}` muted |
| Optional line | Truncated `getAiFact(country)` (~1 line) |

- Sort: stable order from API (backend returns alphabetical); no client-side re-ranking required for v1
- Tap row → `openCountryInExplore(country)` (must focus in feed — see above)

### Empty & error states

| State | UI |
| ----- | --- |
| Loading | Centered `ActivityIndicator` (gold) over list area |
| Zero results | `No countries found` + hint to try another spelling or region |
| Network / 400 / 500 | Inline banner + **Retry** (re-run last query) |
| Backend down | Same as error; input stays usable |

### Styling rules

- Prefer **NativeWind** `className` for layout and typography
- Use **StyleSheet** / inline for: `FlatList` `contentContainerStyle`, `TextInput`, shadows, `Pressable` pressed states, and `AGENTS.md` exceptions
- Reuse utilities from `global.css` (`body-md`, `caption`, etc.)
- **8pt grid** for padding and gaps; min touch target 44×44

## Navigation

| Entry | Action |
| ----- | ------ |
| `HomeSearchBar` press | `openSearch()` — overlay on Home |
| `ExploreTopBar` search | `openSearch()` — overlay on Explore (feed still mounted under scrim) |
| Result row tap | `openCountryInExplore(country)` → overlay closes, Explore shows that country |
| Cancel / scrim / back | `closeSearch()` — return to same tab, same scroll position as before |

## Data & stores

- **`useSearchUiStore`:** only `isOpen` + open/close — keep visibility global, search field state local to the overlay
- **Search overlay:** local `useState` for `query`, `region`, `status`, `results`, `error`
- **Feed:** `focusCountryInFeed` in `useCountryFeedStore` — shared by Search, Home CTAs, trending cards
- **Recently viewed:** via `openCountryInExplore` → `useRecentlyViewedStore.recordView`
- Do not duplicate feed loading inside the overlay
- Do not maintain a second “selected country” outside the feed store — Explore `FlatList` reads `countries[currentIndex]` only

Optional: persist recent search strings only (not full `Country` objects).

## Images

- Result thumbnails: remote URLs via `expo-image`, `contentFit="cover"`
- Bundled assets: `constants/images.ts` only if you add placeholders
- Use `FlagBadge` — do not render raw flag URLs as text

## Out of scope

- Population range filters (backend stretch goal)
- Search on Map or Saved tabs
- Voice search, fuzzy transliteration, or Elasticsearch
- A separate vertical “search results feed” (only hit countries) — breaks the one-feed mental model
- A root stack search route (`app/search.tsx`) — use overlay for v1
- Clerk profile / personalized suggestions
- New backend endpoints

## Acceptance criteria

- `GET /search` works for name-only, region-only, and combined queries
- Home and Explore search entry points open the **overlay** (no route change until a result is chosen)
- Cancel/scrim dismisses overlay; user remains on the tab they started from
- From Explore, opening search does not reset feed position; closing without a selection leaves the same country visible
- Debounced typing does not spam the API
- Results render with flag, name, metadata, and thumbnail when available
- **Tap result → Explore shows that country** (hero + metadata), including when it was **not** in the loaded feed batch
- **Swipe up** from a search-opened country continues the normal feed (not a dead end)
- `focusCountryInFeed` does not create duplicate countries by `name`
- `FlatList` scroll position matches `currentIndex` after opening from search (tab already mounted)
- Recently viewed updates after opening a country
- Idle, loading, empty, and error states are handled
- `npm run lint` passes (run `npm run typecheck` if available)
- No new major dependencies without user approval

## Testing

```bash
# Terminal 1 — backend + Redis (see prompts-worldloop/02)
cd backend && npm run dev

# Terminal 2
npx expo start
```

Use `EXPO_PUBLIC_API_URL` pointing at your machine (LAN IP on a physical device).

1. Home → tap search bar → overlay opens (Home dimmed underneath), keyboard visible
2. Type `jap` → Japan in results → tap Japan → **Explore shows Japan** (not another country)
3. **Critical:** Pick a country unlikely to be in the first feed page (e.g. search `japan` after feed loaded with other countries) → still shows Japan on screen
4. Swipe up from Japan → next feed country appears
5. Type `united` → multiple matches; tap one → correct country in Explore
6. Clear text, tap **Europe** → European list loads; tap a country → Explore shows it
7. Explore → search icon → overlay opens over current country → Cancel → same country still visible, overlay gone
8. Home → open overlay → tap scrim → overlay closes, still on Home
9. Home **Recently Viewed** updates after opening a country from search
10. Stop backend → error + retry works
11. Repeat identical query → faster response (optional: backend Redis cache hit in logs)

## Next steps

After this prompt:

1. Wire Clerk name/avatar into Home header (`10b` follow-up)
2. Map screen search/filter (`prompt_material/map-screen-ui.png`)
3. Saved tab UI
4. Optional: swipe down from search-inserted country returns to previous Explore position (polish, not required for v1)
