Read AGENTS.md first and follow it strictly.

Reference: `prompt_material/explore-screen-ui.png`, `AGENTS.md` (Explore Screen Rules), `prompts/08-zustand.md`, `prompts/09-bottom-tab-nav.md`

Implement the **Explore** tab UI on `app/(tabs)/explore.tsx` exactly as shown in the attached design. Use precise **8-point spacing** throughout (8, 16, 24, 32, …). Match layout, typography, colors, radii, and overlays pixel-for-pixel — do not simplify the design.

Use assets from `assets/` via the centralized `constants/images.ts` import (`import { images } from "@/constants/images"`). Add any new image assets there before using them in screens or components.

@prompt_material/explore-screen-ui.png

## Goal

Replace the Explore placeholder with a **TikTok-style, full-screen country discovery feed**:

- One country visible at a time (vertical paging)
- Immersive hero photo per country
- Country metadata, AI fun fact, and bottom media carousel per `AGENTS.md`
- Right-side action rail (Save, Share, Listen, Like)
- Bottom “Did You Know?” card, swipe hint, and **Learn More** CTA
- Top bar: Search, WorldLoop logo, Save

Wire UI to existing Zustand stores and the backend feed — **no new data libraries**.

## Prerequisites

- `prompts/09-bottom-tab-nav.md` — `(tabs)` routes and custom `components/bottom-tab-bar.tsx` exist; Explore tab is reachable
- `prompts/08-zustand.md` — `store/use-country-feed-store.ts`, `store/use-saved-countries-store.ts`, `lib/api.ts`, `types/country.ts`
- Backend feed running (`GET /feed/countries`) with enriched countries (images + `ai.fact` when available)
- `prompts/01-nativewind.md` and `prompts/02-design-theme.md` — theme tokens in `global.css`, Poppins fonts loaded

## Dependencies

Use what is already installed:

- `expo-router`, `expo-image` (or `Image` from `expo-image` if already in the project)
- `zustand`, `@react-native-async-storage/async-storage`
- `@expo/vector-icons`
- `react-native-reanimated` and/or `react-native-gesture-handler` for vertical paging and carousel gestures
- `react-native-safe-area-context`

Do **not** add React Query, axios, or new navigation libraries without user approval.

## Route & files

| Path                             | Purpose                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(tabs)/explore.tsx`         | Explore screen — composes feed UI, loads feed on mount                                                                                            |
| `components/explore/` (optional) | Extract only when it keeps `explore.tsx` readable: e.g. `CountryFeedPage`, `ExploreTopBar`, `ExploreActionRail`, `MediaCarousel`, `AiFunFactCard` |

Keep business logic in stores/hooks; the screen orchestrates data and gestures.

## Data wiring

### Feed store (`useCountryFeedStore`)

On first mount (or when `countries` is empty):

- Call `loadInitialFeed()`
- Show loading state (subtle overlay or skeleton on hero) while `status === "loading"`
- On error, show retry UI using `error` message

**Current country:** `getCurrentCountry()` or `countries[currentIndex]`.

**Vertical swipe (next / previous country):**

- Swipe **up** → `setCurrentIndex(currentIndex + 1)` (next country)
- Swipe **down** → `setCurrentIndex(currentIndex - 1)` when `currentIndex > 0`
- When user is within **2 items** of the end of `countries`, call `loadMoreFeed()` if `nextCursor` is not null
- Reset horizontal carousel index to `0` when `currentIndex` changes

Use `FlatList` with `pagingEnabled` + `vertical` **or** a full-screen `PagerView`-style pattern — pick the approach that matches the design and teaches vertical paging clearly.

### Saved store (`useSavedCountriesStore`)

- Top-right **Save** and rail **Save** toggle `toggleSaved(country)`; reflect `isSaved(country.name)` (filled vs outline bookmark, gold when saved)
- Do not duplicate saved list logic in the screen

### Country fields (map design → data)

| UI element        | Source                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| Hero + thumbnails | `country.images[]` — first image = hero; carousel uses same array (fallback: single flag or placeholder if empty) |
| Flag + name       | `country.flag`, `country.name`                                                                                    |
| Region badge      | `country.region`                                                                                                  |
| Population        | `country.population` — format compactly (e.g. `33.7M`)                                                            |
| Capital           | `country.capital`                                                                                                 |
| AI Fun Fact       | `country.ai?.fact` — fallback copy if missing: “Fun fact loading…”                                                |
| Did You Know?     | Prefer `country.ai?.caption` or a second line from `ai`; if absent, reuse `ai.fact` or static placeholder for v1  |

Never call OpenAI or expose API keys from the app — AI text comes from the feed API only.

## UI breakdown (match `explore-screen-ui.png`)

### Layout

- **Full-screen** dark immersive screen; content extends under the status bar; respect safe area for top bar and bottom overlays
- **Hero:** edge-to-edge background image with dark gradient scrim at top and bottom for text legibility
- **Tab bar:** already provided by `(tabs)/_layout.tsx` — do not rebuild; ensure bottom padding (`pb-28` or safe area) so overlays sit above the custom tab bar

### Top bar

| Position | Element                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------- |
| Left     | Search icon + “Search” label (tap → no-op or `console.log` for v1; full search is a later prompt)  |
| Center   | WorldLoop wordmark — use `images.worldloopIcon` or dedicated logo asset from `constants/images.ts` |
| Right    | Circular Save button + “Save” label (wired to `toggleSaved`)                                       |

### Country header (top-left overlay)

- Flag emoji/text + large **country name** (white, bold)
- Pill: globe icon + **region**
- Row: people icon + formatted **population**
- Row: pin icon + **capital** + “Capital City” helper text as in design

### AI Fun Fact card (mid-left)

- Rounded dark translucent card (`bg-black/50` or similar)
- Gold “AI Fun Fact” label with sparkle icon
- Body: `country.ai?.fact`

### Right action rail

Vertical stack, right edge, centered vertically:

| Action | v1 behavior                                                                               |
| ------ | ----------------------------------------------------------------------------------------- |
| Save   | `toggleSaved`                                                                             |
| Share  | `Share.share` with country name or no-op alert                                            |
| Listen | Placeholder — optional: `expo-speech` only if already installed; otherwise disabled state |
| Like   | Static count from design (`12.4K`) or hidden until backend supports likes                 |

Icons + labels below each, white text; **Like** uses red heart when “liked” is out of scope use outline only.

### Bottom section

1. **Horizontal media carousel** — rounded square thumbnails; active thumb has white border; sync with pagination dots below
2. **Pagination dots** — one dot per image; active dot filled white
3. **Did You Know?** card — dark rounded card, yellow lightbulb, title + body text
4. **Footer row**
   - Left: “Swipe up for next country” + chevron-up icon
   - Right: gold **Learn More** pill button with arrow (v1: `Alert` or navigate stub; country detail route is a later prompt)

### Spacing & typography

- Use **8pt grid** for padding, gaps, and icon hit areas (minimum 44×44 touch targets)
- White primary text on hero; gold `#fbbf24` / `text-tab-active` for accents and CTA
- Reuse utilities from `global.css` (`h2`, `h3`, `body-md`, `caption`, etc.) where they match the design

### Styling rules

- Prefer **NativeWind** `className` for static layout and typography
- Use **StyleSheet** / inline styles for: `FlatList`/`ScrollView` paging, `Animated` values, gradients, platform shadows, `Pressable` pressed states, and components listed in `AGENTS.md` exceptions
- Do **not** put `className` on `SafeAreaView` from `react-native-safe-area-context`

## Images

- Hero and thumbnails: `country.images` URLs via `expo-image` with `contentFit="cover"`
- Register any bundled assets (logo, placeholders) in `constants/images.ts`
- Do not `require()` images directly inside `explore.tsx` unless there is a strong reason

## Out of scope

- Full **Search** screen and `GET /search` UI (`prompts-worldloop/06-search-and-explore.md`)
- **Home** dashboard (`prompts/10b-home-ui.md`)
- **Map** and **Saved** tab UIs
- Real like counts, comments, or social graph
- Clerk auth, onboarding
- Persisting feed position to AsyncStorage (optional stretch — not required for v1)
- Backend changes unless required to fix missing `images` / `ai` in feed (prefer using existing feed shape)

## Acceptance criteria

- Explore tab shows the full design layout (not placeholder copy) when feed data is available
- Vertical swipe changes country; `loadMoreFeed` runs near end of list
- Horizontal carousel switches active thumbnail and background hero image
- Save (top + rail) toggles bookmark state via `useSavedCountriesStore`
- AI fun fact and country metadata render from API data
- Loading and error states are handled without crashing
- `npm run lint` passes (run `npm run typecheck` if available)
- No new major dependencies without user approval

## Testing

```bash
# Terminal 1 — backend + Redis per prompts-worldloop
# Terminal 2
npx expo start
```

1. Open **Explore** tab — feed loads; first country fills the screen
2. Swipe up — next country; metadata and images update
3. Swipe thumbnails — hero and dots stay in sync
4. Tap Save (top or rail) — country appears in saved store; icon state updates
5. Scroll to near end of feed — more countries load (`loadMoreFeed`)
6. Stop backend — error/retry UI appears; recovery works when backend returns

## Next steps

After this prompt:

1. `prompts/10b-home-ui.md` — Home dashboard on `(tabs)/index.tsx`
2. Search UI + backend search integration
3. Country detail / “Learn More” route
4. Map and Saved screens per their design references
