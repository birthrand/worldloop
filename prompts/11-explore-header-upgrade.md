Read AGENTS.md first and follow it strictly.

Reference: `prompts/10a-explore-ui.md`, `prompts/10c-search-ui.md`, `AGENTS.md` (Explore Screen Rules), `prompt_material/explore-screen-ui.png`, `prompt_material/full-design-system.png`

Upgrade the **Explore top bar** so users can browse by continent without opening search, while keeping search one tap away on the right.

## Goal

Replace the old Explore header layout (search left, save right) with a **minimal text header**:

| Position   | Element                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| **Center** | Horizontally scrollable tabs: **For You** + continent labels (no pills) |
| **Right**  | Search icon only — no glass background                                  |

**Do not** put Save in the header; bookmark remains on the **right action rail** (`ExploreActionRail`).

**Tab order:** `For You | Africa | Americas | Asia | Europe | Oceania`

**Tab behavior:**

- **For You** (default): mixed paginated feed (`GET /feed/countries`); `selectedRegion === null`; underline on **For You** on launch.
- Tap a **continent** → feed shows only countries in that continent (REST Countries `region`: Africa, Americas, Asia, Europe, Oceania).
- Tap **For You** → clear continent filter and restore the default feed (`setRegionFilter(null)` → `loadInitialFeed({ force: true })`).
- Re-tapping the active continent does **nothing** (no toggle-off); use **For You** to return to the mixed feed.
- **Selected** tab: full **white** text (`#ffffff`) with a **narrow white underline** that **slides** from the previous tab (`react-native-reanimated` spring).
- When a continent filter is active, **non-selected** tabs (including **For You**) are **dimmed** (`rgba(255,255,255,0.35)`).
- On **For You**, continent labels use muted white (`rgba(255,255,255,0.7)`).
- **No layout shift** on selection: labels use `paddingBottom: 0`; one shared underline bar moves horizontally (not per-label underlines).

Vertical swiping still works inside the filtered list. Search overlay region chips stay independent but use `CONTINENTS` only from `constants/regions.ts` (no **For You** in search).

## Prerequisites

- `prompts/10a-explore-ui.md` — `ExploreFeed`, `ExploreTopBar`, `CountryFeedPage`
- `prompts/10c-search-ui.md` — `SearchOverlay`, `useSearchUiStore`, `GET /search`
- `prompts/08-zustand.md` — `useCountryFeedStore`, `lib/api.ts`
- Backend `GET /search?region=<name>` deployed and reachable

## Dependencies

Use what is already installed:

- `expo-router`, `zustand`, `@expo/vector-icons`
- `react-native-safe-area-context`
- `react-native-reanimated` (sliding underline)

Do **not** add new libraries without user approval.

## Data model note

REST Countries exposes continents as **`region`** on each country (`Africa`, `Americas`, `Asia`, `Europe`, `Oceania`). The UI label is “continent”; the API/store field remains `region` for consistency with search and the backend.

**For You** is a UI-only tab label (`FOR_YOU_TAB` in `constants/regions.ts`). It is **not** sent to the API. Store uses `selectedRegion: null` for the mixed feed.

## Files

| Path                                       | Purpose                                                           |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `constants/regions.ts`                     | `FOR_YOU_TAB`, `CONTINENTS`, `EXPLORE_HEADER_TABS`, `isContinent` |
| `components/explore/explore-top-bar.tsx`   | Tab scroll + plain search icon (single aligned row)               |
| `components/explore/glass-icon-button.tsx` | `variant="glass"` (default) for action rail; optional `plain`     |
| `store/use-country-feed-store.ts`          | `selectedRegion`, `setRegionFilter`, `loadInitialFeed({ force })` |
| `components/search/search-overlay.tsx`     | Import `CONTINENTS` only (continents, not For You)                |

## Store behavior (`useCountryFeedStore`)

### State

```ts
selectedRegion: string | null; // null = For You (mixed feed)
```

### `setRegionFilter(region: string | null)`

| `region`                   | Behavior                                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string` (e.g. `"Europe"`) | `GET /search?region=Europe` via `fetchSearchCountries(undefined, region)` → replace `countries`, set `nextCursor: null`, `currentIndex: 0`, `selectedRegion: region` |
| `null`                     | `resetFeed()` then `loadInitialFeed(undefined, { force: true })` → default shuffled paginated feed (For You)                                                         |

Only pass real continent names from `CONTINENTS` — never `"For You"`.

### `loadMoreFeed`

No-op while `selectedRegion !== null` (region browse returns the full set; no cursor).

### `loadInitialFeed(limit?, options?: { force?: boolean })`

When `force: true`, reload even if `countries.length > 0` (used when switching back to **For You**).

## UI spec (`ExploreTopBar`)

### Layout

- Single row inside safe area (`paddingTop: insets.top + 8`).
- `flex-row` + `items-center` so tabs and the search icon share the **same vertical centerline**.
- **Tabs**: `ScrollView` horizontal, `flex: 1`, `marginRight: 12`, `showsHorizontalScrollIndicator={false}`.
- **Search**: `Pressable` 44×44, icon only — **no** circle background, border, or scrim.

### Tab labels (not chips)

- **No** pill background, **no** border on items.
- Font: `15px`; unselected tabs use `Poppins-Medium`, **selected** tab uses `Poppins-SemiBold`.
- Spacing between labels: `marginLeft: 16` on tab wrappers after the first (**For You** has no left margin).
- Touch target: `minHeight: 44`, `hitSlop: 8`.
- **All labels**: `paddingBottom: 0` (fixed; text never jumps; underline sits flush under the label).
- **Track**: `paddingBottom: 2` on `continentsTrack` (fits the 2px underline; touch target via `minHeight: 44`).
- **Selected**: text `#ffffff`, `Poppins-SemiBold`.
- **Unselected with continent filter active**: text `rgba(255, 255, 255, 0.35)`.
- **For You selected** (`selectedRegion === null`): **For You** white; continents `rgba(255, 255, 255, 0.7)`.

### Sliding underline (single indicator)

- One `Animated.View` inside the tab **track** (`continentsTrack` has `position: "relative"`, `collapsable={false}`).
- Underline: `position: "absolute"`, `bottom: 0`, animated **`left`** + `width` (do **not** use `translateX` from `0` — that makes the bar appear to fly in from the screen edge).
- **Selected tab key**: `selectedRegion ?? FOR_YOU_TAB` — underline always tracks the active tab (including **For You** on launch).
- **Measure with `measureLayout`**, not child `onLayout` `x` alone:
  - `trackRef` on the row container.
  - Each tab wrapped in a `View` with a ref (`tabRefs[name]`).
  - On selection (and when the selected tab re-layouts), call `tab.measureLayout(track, (x, _y, width) => …)` so `x` is relative to the track.
  - Retry once on the next frame if layout is not ready.
- Tab spacing: `marginLeft: 16` on wrappers (avoid `gap` for measurement quirks).
- Underline width: `min(tabWidth * 0.55, 40)` — **narrower than the label**, centered: `left = x + (tabWidth - narrowWidth) / 2`.
- **First show**: set `left` / `width` immediately, then fade opacity in.
- **Switch tab**: spring `left` + `width` with `withSpring({ damping: 20, stiffness: 280 })`.
- Color: `#ffffff`, height `2px`, `borderRadius: 1`.

### Search control

- `Ionicons` `search`, size `24`, white — not `GlassIconButton` with glass styling (use a plain `Pressable` or `GlassIconButton` with `variant="plain"` elsewhere if reused).

### Accessibility

- Search: `Search countries`
- **For You**: `Show your personalized country feed`
- Each continent: `Show countries in {continent}`, `accessibilityState.selected` when active

## User flows

### Default For You feed

1. Open Explore tab → mixed feed loads; **For You** selected with underline.
2. Swipe vertically through countries; `loadMoreFeed` paginates.

### Browse Europe in Explore

1. Tap **Europe** → feed reloads to European countries only; underline slides to **Europe**; **For You** and other continents dimmed.
2. Tap **Asia** → underline animates from Europe to Asia without shifting label text.
3. Swipe vertically through filtered countries.
4. Tap **For You** → filter clears; default feed reloads; underline slides back to **For You**.

### Search still available

1. Tap search (right) → overlay opens (unchanged from `10c-search-ui.md`).
2. Pick a result → `focusCountryInExplore` (unchanged).

### Save still available

- Use the **action rail** Save control on the current country card — not the header.

## Error & empty states

- If `setRegionFilter` fails → `status: "error"`, `error` message; existing `ExploreError` on explore screen when `countries.length === 0`.
- If search returns zero countries for a region → consider a friendly empty message in a follow-up (optional v1.1).

## Testing checklist

- [ ] Explore opens with **For You** selected and underline visible
- [ ] Each continent label filters feed to matching `country.region`
- [ ] Tap **For You** restores default mixed feed
- [ ] Re-tapping active continent does not clear filter
- [ ] Selected tab shows white text; underline is narrow and centered under label
- [ ] Underline slides tab-to-tab (not from screen left); position comes from `measureLayout` relative to track
- [ ] Non-selected tabs dim when a continent filter is active
- [ ] No background on tab labels or search icon
- [ ] Tabs and search icon vertically aligned on one row
- [ ] Header has no Save icon; rail Save still works
- [ ] Search (right) opens overlay; does not break continent filter state
- [ ] `loadMoreFeed` does not fire when a continent is selected
- [ ] `npm run lint` passes

## Out of scope (later prompts)

- Persist last-selected tab across app restarts
- Backend `GET /feed/countries?region=` (v1 uses search endpoint for region browse)
- Auto-scroll horizontal list to center selected tab
- True personalization for **For You** (v1 is the existing shuffled paginated feed)
