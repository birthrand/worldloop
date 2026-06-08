Read AGENTS.md first and follow it strictly.

Reference: `prompt_material/saved-screen-ui.png`, `AGENTS.md` (app structure, data model), `prompts/08-zustand.md`, `prompts/09-bottom-tab-nav.md`, `prompts/10a-explore-ui.md`, `prompts/10b-home-ui.md`

Implement the **Saved** tab UI on `app/(tabs)/saved.tsx` exactly as shown in the attached design. Use precise **8-point spacing** throughout (8, 16, 24, 32, …). Match layout, typography, colors, radii, and card treatments pixel-for-pixel — do not simplify the design.

Use assets from `assets/` via the centralized `constants/images.ts` import (`import { images } from "@/constants/images"`). Add any new image assets there before using them in screens or components.

@prompt_material/saved-screen-ui.png

## Goal

Replace the Saved placeholder with a **bookmark library** screen that groups saved countries into teachable sections:

- Centered **WorldLoop** wordmark header
- Page title **Saved** with subtitle and search / filter affordances
- Horizontal **category filter tabs** (All, Favorites, Want to Visit, Recently Saved)
- **Favorites** hero card (featured saved country with stats + exploration ring)
- **Want to Visit** horizontal carousel of vertical destination cards
- **Recently Saved** vertical list with thumbnails and relative timestamps
- Bookmark toggles on every card (gold when saved)
- Tap any country → open it in the Explore feed

Wire UI to existing Zustand stores — **no new data libraries**.

## Prerequisites

- `prompts/09-bottom-tab-nav.md` — `(tabs)` routes and custom `components/bottom-tab-bar.tsx` exist; Saved tab is reachable
- `prompts/08-zustand.md` — `store/use-saved-countries-store.ts`, `store/use-country-feed-store.ts`, `lib/api.ts`, `types/country.ts`
- `prompts/10a-explore-ui.md` — Explore feed + `openCountryInExplore` (or equivalent) so card taps land on the correct country
- `prompts/10b-home-ui.md` — `store/use-discovery-progress-store.ts`, `lib/format-relative-time.ts`, `FlagBadge`, `formatPopulation`, `getCountryImages`, `getAiFact`
- `prompts/01-nativewind.md` and `prompts/02-design-theme.md` — theme tokens in `global.css`, Poppins fonts loaded
- Backend feed running (`GET /feed/countries`) with enriched countries (`images`, `ai.fact` when available) — used for seeding and enriching saved entries

## Dependencies

Use what is already installed:

- `expo-router`, `expo-image`
- `zustand`, `@react-native-async-storage/async-storage`
- `@expo/vector-icons`
- `react-native-safe-area-context`

Use `react-native-svg` **only if already installed** for circular progress rings; otherwise use a teachable workaround (partial border, static ring image) without adding new libraries unless the user approves.

Do **not** add React Query, axios, or new navigation libraries without user approval.

## Route & files

| Path                           | Purpose                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tabs)/saved.tsx`         | Saved screen — composes header, filter tabs, and section lists                                                                                            |
| `components/saved/` (optional) | Extract when it keeps `saved.tsx` readable: e.g. `SavedHeader`, `SavedFilterTabs`, `SavedFavoriteHeroCard`, `SavedWantToVisitCard`, `SavedRecentListItem` |

Keep business logic in stores/hooks; the screen orchestrates layout, filtering, and navigation.

## Data wiring

### Saved store (`useSavedCountriesStore`)

Extend the existing store to support the Saved screen sections. Keep `toggleSaved` / `isSaved` behavior compatible with Explore, Home, and Map.

Add fields:

| Field            | Purpose                                                                           |
| ---------------- | --------------------------------------------------------------------------------- |
| `savedAtByName`  | `Record<string, number>` — timestamp when each country was saved (ms since epoch) |
| `categoryByName` | `Record<string, SavedCategory>` — `'favorites' \| 'want-to-visit'`                |

Update `toggleSaved(country)`:

- On **save**: set `savedAtByName[name] = Date.now()`; default `categoryByName[name]` to `'favorites'` when unset
- On **unsave**: remove entries from both maps

Add helpers:

- `getSavedAt(name: string): number | null`
- `setCategory(name: string, category: SavedCategory)` — for filter chip / long-press stretch; v1 can stay read-only after seed
- `getCountriesByCategory(category: SavedCategory): Country[]` — filter `savedCountries` by `categoryByName`

Persist new maps with the existing AsyncStorage key (`worldloop-saved-countries`).

### Seed data (first launch)

When `savedCountries` is empty after hydration, seed entries matching the design so the screen is never blank on first open:

| Country     | Category        | Relative time (for `savedAt`) |
| ----------- | --------------- | ----------------------------- |
| Peru        | `favorites`     | 3 days ago                    |
| Japan       | `want-to-visit` | 1 week ago                    |
| Iceland     | `want-to-visit` | 5 days ago                    |
| New Zealand | `want-to-visit` | 2 days ago                    |
| Italy       | `favorites`     | 2 hours ago                   |
| Morocco     | `favorites`     | yesterday                     |
| Canada      | `want-to-visit` | 2 days ago                    |

Resolve full `Country` objects from `useCountryFeedStore` when the feed is loaded; if the feed is not ready, store minimal seed objects (name, flag, capital, region, population, `images`) inline so the UI still renders, then merge when feed arrives.

**Recently Saved** section: sort all saved countries by `savedAt` descending; show the 3 most recent (Italy, Morocco, Canada in the design).

**Favorites** hero: first country in `favorites` category (Peru in seed).

**Want to Visit** row: all `want-to-visit` countries in horizontal scroll (Japan, Iceland, New Zealand in seed).

### Discovery progress (`useDiscoveryProgressStore`)

Per-country **Explored %** on cards:

- If the country was visited (`isCountryVisited(country)`), show a non-zero percent
- v1 mapping: use `worldProgressPercent` for the Favorites hero when it is the only visited country, or a simple per-country stub:

```ts
// Teachable v1 — deterministic mock from country name hash, or 0 when not visited
function getCountryExploredPercent(country: Country, visited: boolean): number {
  if (!visited) return 0;
  // Match design: Peru 28%, Japan 10%, Iceland 15%, New Zealand 5%
  const DESIGN_PERCENTS: Record<string, number> = {
    Peru: 28,
    Japan: 10,
    Iceland: 15,
    "New Zealand": 5,
  };
  return DESIGN_PERCENTS[country.name] ?? 12;
}
```

Prefer real visit data from `useDiscoveryProgressStore`; fall back to design percents for seeded countries so the reference layout matches on first launch.

### Country fields (map design → data)

| UI element       | Source                                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| Hero / thumbnail | `getCountryImages(country)[0]` — fallback: dark gradient + flag                       |
| Flag + name      | `FlagBadge` + `country.name`                                                          |
| Description      | `getAiFact(country)` — truncate ~1–2 lines; design fallback copy when AI text missing |
| Population       | `formatPopulation(country.population)`                                                |
| Capital          | `country.capital`                                                                     |
| Region           | `country.region`                                                                      |
| Timestamp        | `formatRelativeTime(savedAt)` from `lib/format-relative-time.ts`                      |
| Bookmark state   | `isSaved(country.name)` — gold filled when saved                                      |

Never call OpenAI or expose API keys from the app.

### Filter tabs

| Tab                | v1 filter behavior                                                                 |
| ------------------ | ---------------------------------------------------------------------------------- |
| **All**            | Show all three sections (Favorites hero + Want to Visit row + Recently Saved list) |
| **Favorites**      | Show only Favorites hero (or list if multiple favorites)                           |
| **Want to Visit**  | Show only horizontal Want to Visit carousel                                        |
| **Recently Saved** | Show only Recently Saved vertical list                                             |

Active tab: gold border + gold text. Inactive: muted gray text, no border.

## UI breakdown (match `saved-screen-ui.png`)

### Screen shell

- **Background:** dark immersive (`bg-background` / midnight navy `#0b132b` family)
- **ScrollView** with bottom padding (`pb-28` or safe area) so content clears the custom tab bar from `(tabs)/_layout.tsx`
- **Do not rebuild** the bottom tab bar — it already lives in `components/bottom-tab-bar.tsx`
- Saved tab icon in the tab bar is **active** (gold bookmark in glowing square) when this screen is focused — handled by existing tab layout

### Header

| Element  | Spec                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Logo     | Centered **WorldLoop** wordmark — reuse `images.worldloopIcon` or logo asset from `constants/images.ts` (same as Home / Explore) |
| Title    | **Saved** — large white bold (`h2` or design-matched size)                                                                       |
| Subtitle | `Your favorite places, all in one loop.` — muted gray (`body-md` / `text-white/60`)                                              |
| Search   | Circular dark button, magnifying glass icon — v1: open shared search overlay (`prompts/10c-search-ui.md`) or stub `console.log`  |
| Filter   | Circular dark button, filter/list icon — v1: no-op or `Alert` (“Filter coming soon”)                                             |

Layout: title block left-aligned; search + filter aligned top-right on the same row as the title (or title row below logo per design proportions).

### Category filter tabs

- Horizontal `ScrollView` of pill chips below the header
- Chips: **All**, **Favorites**, **Want to Visit**, **Recently Saved**
- Active chip (`All` in design): gold border (`border-tab-active`), gold text, dark fill
- Inactive chips: dark gray fill, muted white/gray text, no gold border
- Gap between chips: 8–12px; horizontal padding on the row: 24px (`px-6`)

### Favorites section

- Section header row: `⭐ Favorites` (white semibold) + gold **View All >** on the right (v1: no-op)
- **Hero card** (Peru in design):
  - Full-width rounded card (`rounded-3xl`), min height ~200–240px
  - Background: country hero image with dark gradient scrim
  - Top-left: `FlagBadge` + large white **country name**
  - Top-right: gold filled **bookmark** icon (tap → `toggleSaved`)
  - Body: 1–2 line description (muted white)
  - Bottom-left stats row (icons + labels):
    - People icon + `{population} Population`
    - Pin icon + `{capital} Capital`
    - Globe icon + `{region} Region`
  - Bottom-right: circular progress ring with `{percent}%` center + `Explored` label below (gold accent)
- Tap card → `openCountryInExplore(country)`

Reuse patterns from `components/home/country-of-the-day-card.tsx` where it keeps the code teachable (hero image, overlay, stats row).

### Want to Visit section

- Section header: `✈️ Want to Visit` + gold **View All >**
- Horizontal `ScrollView` of **vertical cards** (~140–160px wide, ~220–260px tall)
- Each card:
  - Rounded corners (`rounded-2xl`), hero image background + scrim
  - Top-right: gold bookmark icon
  - Flag + **country name** (bold white)
  - 1-line description (small muted text)
  - Bottom: thin horizontal **progress bar** (gold fill on dark track) + `{percent}%` label
- Cards in design: Japan (10%), Iceland (15%), New Zealand (5%)
- Tap card → `openCountryInExplore(country)`

### Recently Saved section

- Section header: `🕒 Recently Saved` + gold **View All >**
- Vertical list of **row items** (not horizontal scroll)
- Each row:
  - Left: small rounded thumbnail (~56–64px square) from `getCountryImages`
  - Center column: flag emoji/badge + **country name** (bold) + 1-line description (muted)
  - Right column: relative time (`2h ago`, `Yesterday`, `2d ago`) + outline/filled bookmark icon
- Row separator or gap: 12–16px between items
- Tap row → `openCountryInExplore(country)`

Reuse `formatRelativeTime` from `components/home/recently-viewed-section.tsx` patterns.

### Empty states

When the user has unsaved everything (or a filtered section is empty):

| Section           | Copy                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------- |
| Favorites         | `No favorites yet — tap Save on a country in Explore.`                                 |
| Want to Visit     | `No destinations queued — save countries you want to visit.`                           |
| Recently Saved    | `Nothing saved recently.`                                                              |
| All (fully empty) | Centered illustration optional; primary CTA: **Explore countries** → `/(tabs)/explore` |

Keep empty states friendly and short; do not crash when `savedCountries.length === 0`.

### Spacing & typography

- **8pt grid** for padding, gaps, and touch targets (minimum 44×44)
- White primary text on dark surfaces; gold `text-tab-active` / `#fbbf24` for accents, active tabs, progress, and bookmarks
- Reuse utilities from `global.css` (`h2`, `h3`, `h4`, `body-md`, `body-sm`, `caption`, etc.) where they match the design
- Section vertical gap: 24–32px between Favorites, Want to Visit, and Recently Saved blocks

### Styling rules

- Prefer **NativeWind** `className` for static layout and typography
- Use **StyleSheet** / inline styles for: circular progress rings, horizontal list `contentContainerStyle`, shadows, `Pressable` pressed states, gradient scrims, and `AGENTS.md` exceptions
- Do **not** put `className` on `SafeAreaView` from `react-native-safe-area-context`

## Images

- Country heroes/thumbnails: remote URLs via `expo-image` with `contentFit="cover"`
- Bundled assets (logo): `constants/images.ts` only
- Do not `require()` images directly inside `saved.tsx` unless there is a strong reason

## Navigation (v1)

| Action                          | Behavior                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Tap any country card / row      | `openCountryInExplore(country)` — switch to Explore tab with that country focused |
| Bookmark tap on card            | `toggleSaved(country)` — remove from list with animation or instant update        |
| Search icon                     | Open shared search overlay (if implemented) or stub                               |
| Filter icon                     | Stub                                                                              |
| View All >                      | No-op or `console.log` until dedicated list routes exist                          |
| Explore countries (empty state) | `router.push("/(tabs)/explore")`                                                  |

## Out of scope

- Full **Search** screen changes beyond reusing the existing overlay
- **Map** tab UI changes
- Backend endpoints for saved lists, sync across devices, or social sharing
- Drag-and-drop reordering of saved countries
- Multi-select bulk delete (single `toggleSaved` unsave is enough for v1)
- Clerk auth / cloud sync of bookmarks
- Real per-country exploration scoring API (use local discovery store + design stubs)
- Separate routes for “View All” list screens

## Acceptance criteria

- Saved tab shows the full design layout from `saved-screen-ui.png` (not placeholder “Coming in a later lesson”)
- Category filter tabs switch visible sections correctly
- Favorites hero, Want to Visit carousel, and Recently Saved list render from `useSavedCountriesStore`
- First launch seeds design-matching countries when the saved list is empty
- Bookmark icons reflect saved state; tap unsaves and updates the UI
- Exploration percent rings / bars render (visited countries or design seed values)
- Tapping any country opens Explore focused on that country
- Empty states render gracefully when all countries are unsaved
- `npm run lint` passes (run `npm run typecheck` if available)
- No new major dependencies without user approval

## Testing

```bash
# Terminal 1 — backend + Redis per prompts-worldloop
# Terminal 2
npx expo start
```

1. Open **Saved** tab — full UI loads with seeded countries on first launch
2. Confirm **All** tab shows Favorites hero, Want to Visit row, and Recently Saved list
3. Tap **Favorites** filter — only Favorites section visible
4. Tap **Want to Visit** filter — only horizontal carousel visible
5. Tap **Recently Saved** filter — only vertical list visible
6. Tap **Peru** hero card — Explore opens on Peru
7. Tap bookmark on a card — country removes from saved list; counts update
8. Save a country from Explore — return to Saved — it appears in Recently Saved with a fresh timestamp
9. Unsave all countries — empty states appear without crash
10. Restart app — saved list and categories persist from AsyncStorage

## Next steps

After this prompt:

1. “View All” dedicated list screens per category
2. Filter sheet (sort by date, region, exploration %)
3. Long-press to move country between Favorites and Want to Visit
4. Cloud sync of bookmarks when Clerk auth is wired
5. Profile tab UI per its design reference
