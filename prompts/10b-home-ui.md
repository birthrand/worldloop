Read AGENTS.md first and follow it strictly.

Reference: `prompt_material/home-screen-ui.png`, `AGENTS.md` (app structure, data model), `prompts/08-zustand.md`, `prompts/09-bottom-tab-nav.md`, `prompts/10a-explore-ui.md`

Implement the **Home** tab dashboard on `app/(tabs)/index.tsx` exactly as shown in the attached design. Use precise **8-point spacing** throughout (8, 16, 24, 32, …). Match layout, typography, colors, radii, and card treatments pixel-for-pixel — do not simplify the design.

Use assets from `assets/` via the centralized `constants/images.ts` import (`import { images } from "@/constants/images"`). Add any new image assets there before using them in screens or components.

@prompt_material/home-screen-ui.png

## Goal

Replace the Home placeholder with the **WorldLoop discovery dashboard**:

- Personalized greeting header with profile avatar
- Search bar with **Discover** affordance
- **Country of the Day** hero card (featured country)
- **Trending Countries** horizontal carousel
- **Learning streak** + **world progress** stats row
- **Recently Viewed** horizontal list
- Scrollable content above the existing custom tab bar

Wire real country data from the feed store where possible. Use local Zustand + AsyncStorage for engagement stats (streak, progress, recently viewed) — no new backend endpoints for v1.

## Prerequisites

- `prompts/09-bottom-tab-nav.md` — `(tabs)` routes and `components/bottom-tab-bar.tsx` exist; Home tab is the default landing tab
- `prompts/08-zustand.md` — `store/use-country-feed-store.ts`, `store/use-saved-countries-store.ts`, `lib/api.ts`, `types/country.ts`
- `prompts/01-nativewind.md` and `prompts/02-design-theme.md` — theme tokens in `global.css`, Poppins fonts loaded
- Backend feed running (`GET /feed/countries`) with enriched countries (`images`, `ai.fact` when available)
- `prompts/10a-explore-ui.md` recommended (Explore feed UI) so “Explore country” CTAs have a meaningful destination — Home can still ship with navigation stubs if Explore is not done yet

## Dependencies

Use what is already installed:

- `expo-router`, `expo-image`
- `zustand`, `@react-native-async-storage/async-storage`
- `@expo/vector-icons`
- `react-native-safe-area-context`

Do **not** add React Query, axios, chart libraries, or new navigation libraries without user approval.

## Route & files

| Path | Purpose |
| ---- | ------- |
| `app/(tabs)/index.tsx` | Home screen — composes dashboard sections, loads feed on mount |
| `components/home/` (optional) | Extract when it keeps `index.tsx` readable: e.g. `HomeHeader`, `HomeSearchBar`, `CountryOfTheDayCard`, `TrendingCountryCard`, `LearningStreakCard`, `WorldProgressCard`, `RecentlyViewedCard` |

Keep business logic in stores/hooks; the screen orchestrates layout and navigation.

## Data wiring

### Feed store (`useCountryFeedStore`)

On mount (when `countries` is empty):

- Call `loadInitialFeed()`
- Show a skeleton or subtle loading state on cards while `status === "loading"`
- On error, show inline retry (banner or card-level) using `error` — do not crash the whole screen

**Country of the Day:** use `countries[0]` when the feed has loaded. If the feed is empty, show a placeholder card with static copy from the design.

**Trending Countries:** use `countries.slice(1, 5)` (or the next 4–6 items after the featured country). If fewer countries exist, show what is available.

Reuse helpers from `lib/format-country.ts`:

- `formatPopulation(country.population)` → e.g. `33.7M`
- `getCountryImages(country)` for hero/thumbnail URLs
- `getAiFact(country)` or a short trimmed line for the featured card description when `ai.fact` is long

Use `FlagBadge` from `components/explore/flag-badge.tsx` (or the same flagcdn pattern) — do not render flag URLs as plain text.

### Saved store (`useSavedCountriesStore`)

- **Love this place** pill on the Country of the Day card: reflect saved state via `isSaved(country.name)`; tap toggles `toggleSaved(country)`
- Heart count (`12.4K`) is **static design copy** for v1 unless a likes API exists later

### Local engagement store (add for this prompt)

Create `store/use-discovery-progress-store.ts` (name can vary; keep it teachable):

| Field | v1 behavior |
| ----- | ----------- |
| `streakDays` | Default `12` (match design); persist with AsyncStorage |
| `weekProgress` | Boolean[7] for Mon–Sun checkmarks (design shows M–S checked, Sun empty) |
| `countriesExplored` | Default `28` |
| `quizzesCompleted` | Default `56` |
| `worldProgressPercent` | Default `28` (drives the circular ring) |

Persist on change. No backend — this teaches local gamification state.

### Recently viewed store (add for this prompt)

Create `store/use-recently-viewed-store.ts`:

- Keep last **4–8** countries the user opened (name + viewed-at timestamp)
- Persist with AsyncStorage
- Seed with mock entries matching the design (`Peru` / `Just now`, `Italy` / `2h ago`, etc.) **only when the list is empty** so first launch matches the reference
- When the user opens a country from Home or Explore (future hook), call `recordView(country)` — for v1, recording on **Explore Peru** / trending card tap is enough

## UI breakdown (match `home-screen-ui.png`)

### Screen shell

- **Background:** dark immersive (`bg-midnight-navy` or design-matched `#121212`-style surface)
- **ScrollView** (or `FlashList` with header sections) with bottom padding (`pb-28` or safe area) so content clears the custom tab bar from `(tabs)/_layout.tsx`
- **Do not rebuild** the bottom tab bar — it already lives in `components/bottom-tab-bar.tsx`

### Header

| Element | Spec |
| ------- | ---- |
| Logo | Centered **WorldLoop** wordmark — use `images.worldloopIcon` or a dedicated logo asset in `constants/images.ts` |
| Greeting | `Good morning, Alex 👋` — time-based greeting (`morning` / `afternoon` / `evening`); name is placeholder `Alex` until Clerk profile is wired |
| Subtitle | `Where will curiosity take you today?` — muted gray |
| Avatar | Circular profile image top-right — use a bundled placeholder in `constants/images.ts` for v1 |

### Search bar

- Full-width rounded dark field
- Left: magnifying glass + placeholder `Search countries, regions, cultures…`
- Right: gold **Discover** label with fire icon
- v1 tap: `console.log` or `Alert` — full search is a later prompt (`prompts-worldloop/06-search-and-explore.md`)

### Country of the Day card

Large rounded card with background image (`getCountryImages(country)[0]` or gradient fallback):

| Area | Content |
| ---- | ------- |
| Tag | `✨ COUNTRY OF THE DAY` — gold, small caps |
| Title | `FlagBadge` + country **name** — large white bold |
| Body | Short line from `ai.fact` (truncate ~2 lines) or design fallback copy |
| Stats row | Population · Capital · Region with icons (reuse Explore iconography) |
| CTA | Gold pill **Explore {Country} →** — navigate to `/(tabs)/explore` and set feed `currentIndex` to that country if possible |
| Social pill | `❤️ 12.4K Love this place` — translucent; wired to saved toggle |

### Trending Countries

- Section title **Trending Countries** + gold **View All >** (v1: no-op or scroll to end)
- Horizontal `ScrollView` / `FlatList` with `horizontal`
- Cards: vertical image, flag + name, gold **🔥 Trending** sublabel
- Tap card → Explore tab focused on that country (or stub alert)

### Stats row (two columns)

**Left — Learning streak**

- Title: `🔥 Your Learning Streak` (gold)
- `12 days` large white + `Keep it going!` muted
- Row of 7 day circles (M–S) from `weekProgress` in the discovery store

**Right — Your Progress**

- Circular progress ring with `{worldProgressPercent}%` center label
- Subtext: `of the world explored`
- Stacked mini stat cards on the far right:
  - Globe + `{countriesExplored} Countries Explored`
  - Quiz icon + `{quizzesCompleted} Quizzes Completed`

Implement the ring with `react-native-svg` **only if already installed**; otherwise use a simple teachable workaround (conic gradient View, partial border, or static ring image) without adding new libraries unless the user approves.

### Recently Viewed

- Section title **Recently Viewed** + gold **See All >**
- Horizontal smaller cards: image, country name, relative time (`Just now`, `2h ago`, `Yesterday`)
- Use `use-recently-viewed-store` timestamps; format with a small helper in `lib/` if needed

### Spacing & typography

- **8pt grid** for padding, gaps, and touch targets (minimum 44×44)
- White primary text on dark surfaces; gold `text-tab-active` / `#fbbf24` for accents and CTAs
- Reuse utilities from `global.css` (`h2`, `h3`, `h4`, `body-md`, `caption`, etc.) where they match the design

### Styling rules

- Prefer **NativeWind** `className` for static layout and typography
- Use **StyleSheet** / inline styles for: circular progress, horizontal lists’ `contentContainerStyle`, shadows, `Pressable` pressed states, and `AGENTS.md` exceptions
- Do **not** put `className` on `SafeAreaView` from `react-native-safe-area-context`

## Images

- Country heroes/thumbnails: remote URLs via `expo-image` with `contentFit="cover"`
- Bundled assets (logo, avatar, placeholders): `constants/images.ts` only
- Do not `require()` images directly inside `index.tsx` unless there is a strong reason

## Navigation (v1)

| Action | Behavior |
| ------ | -------- |
| Explore Peru / trending tap | `router.push("/(tabs)/explore")` + `setCurrentIndex` for that country in `useCountryFeedStore` |
| View All / See All | No-op or `console.log` until list screens exist |
| Discover (search) | Stub |
| Profile avatar | Stub or `/(tabs)/profile` |

## Out of scope

- Full **Search** screen and backend search
- **Map** and **Saved** tab UIs (`prompt_material/map-screen-ui.png`, `saved-screen-ui.png`)
- Real like counts, social graph, or quiz backend
- Clerk auth / real user name and photo (use placeholders)
- TikTok-style Explore feed implementation (that is `prompts/10a-explore-ui.md`)
- Backend changes unless required to fix missing `images` / `ai` in feed

## Acceptance criteria

- Home tab shows the full dashboard layout from the design (not placeholder “Coming in a later lesson”)
- Feed loads and powers **Country of the Day** + **Trending** with real API data when the backend is up
- Streak and progress sections render from the local discovery store (persisted)
- Recently viewed section renders from its store (seeded on first launch, then real entries after taps)
- **Explore** CTA navigates to the Explore tab
- Save/Love pill toggles bookmark state via `useSavedCountriesStore`
- Loading and error states for feed data do not crash the screen
- `npm run lint` passes (run `npm run typecheck` if available)
- No new major dependencies without user approval

## Testing

```bash
# Terminal 1 — backend + Redis per prompts-worldloop
# Terminal 2
npx expo start
```

1. Launch app — lands on **Home** with dashboard UI
2. Confirm Country of the Day shows feed data (name, flag, stats, image)
3. Scroll trending row — cards match design proportions
4. Tap **Explore Peru** (or featured CTA) — Explore tab opens
5. Tap **Love this place** — saved state toggles; verify on `/dev` or Saved count if surfaced
6. Kill backend and relaunch — Home shows retry or graceful empty states
7. Restart app — streak/progress values persist from AsyncStorage

## Next steps

After this prompt:

1. Search UI + `GET /search` integration
2. Wire Clerk profile into greeting and avatar
3. Map and Saved screens per their design references
4. Record recently viewed automatically when swiping the Explore feed
