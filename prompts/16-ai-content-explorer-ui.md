Read AGENTS.md first and follow it strictly.

Reference: `AGENTS.md` (data model, styling rules), `prompts/02-design-theme.md`, `prompts/08-zustand.md`, `prompts/09-bottom-tab-nav.md`, `prompts-worldloop/04-ai-content-service.md`, `prompts-worldloop/14-landmarks-data-pipeline.md`

Build a React Native (Expo + TypeScript) screen called **`AIContentExplorerScreen`** — the **AI Country Explorer** profile deep-dive for a single country.

This screen is part of **WorldLoop** — a globe-based country discovery app. Users open it from Explore, the map country sheet, or feed interactions to go beyond the TikTok-style swipe card.

The UI is a **scrollable country profile** with an edge-to-edge hero image carousel, raised dark content panel, real Wikipedia overview, backend landmarks, geography facts, and a tappable location map. It uses a dark navy background with **amber accent** tokens (`constants/ai-explorer-theme.ts`), not the older cyan/green dashboard mock.

Use assets from `assets/` via the centralized `constants/images.ts` import (`import { images } from "@/constants/images"`).

---

## Goal

Implement a **country profile explorer** where a selected country feels like a **data-rich living entity**:

- Full-screen ambient blurred globe background
- Edge-to-edge **hero image carousel** with back button overlay
- Raised profile panel: name, flag chip, quick stats, and stacked sections
- **Location** map preview (tappable → focus country on Map tab)
- **Overview** from Wikipedia extract (with skeleton + read more)
- **Did you know?** AI fact callout
- **Landmarks** from backend (expandable list)
- **Geography** fact grid (coordinates, area, timezone, etc.)
- **Learn more** Wikipedia link when available

Wire real country, Wikipedia, landmarks, and AI data from the backend profile endpoint. Cache aggressively so the screen opens instantly from Explore/Map.

---

## Prerequisites

- `prompts/01-nativewind.md` and `prompts/02-design-theme.md` — theme tokens in `global.css`, Poppins fonts loaded
- `prompts/08-zustand.md` — `store/use-country-feed-store.ts`, `lib/api.ts`, `types/country.ts`
- `prompts/09-bottom-tab-nav.md` — `(tabs)` routes exist; this screen is a **stack push**, tab bar hidden
- Backend running with:
  - `GET /feed/countries` — enriched countries for feed fallback
  - `GET /country/:name/profile` — country + Wikipedia + landmarks (`backend/src/controllers/profile.controller.ts`)
- `prompts-worldloop/04-ai-content-service.md` — AI fields on country objects (`ai.fact`, `ai.caption`, `ai.facts[]`)
- `prompts-worldloop/14-landmarks-data-pipeline.md` — landmarks service (Wikidata / OSM / Wikipedia)

Recommended (not blocking):

- `prompts/10a-explore-ui.md` or `components/explore/` — consistent country metadata formatting via `lib/format-country.ts`
- `prompts/12-map-ui.md` — map focus helper (`lib/open-country-on-map.ts`)

---

## Dependencies

Use what is already installed:

- `expo-router`, `expo-image`, `expo-blur`, `expo-linear-gradient`, `expo-web-browser`
- `zustand`, `@react-native-async-storage/async-storage`
- `@expo/vector-icons`
- `react-native-reanimated` — location pin pulse on map preview
- `react-native-safe-area-context`

Do **not** add external UI kits, React Query, or axios without user approval.

---

## Route & files

| Path | Purpose |
| ---- | ------- |
| `app/country/[name]/ai-explorer.tsx` | **Primary route** — stack screen; `name` param is country name |
| `app/country/_layout.tsx` | Stack layout — `headerShown: false`, navy background, slide animation |
| `components/ai-explorer/` | Reusable UI blocks |
| `hooks/use-ai-explorer-country.ts` | Country + Wikipedia + landmarks state, cache hydration |
| `lib/open-country-ai-explorer.ts` | Navigation helpers (`openCountryAiExplorer`, `warmCountryAiExplorer`) |
| `lib/country-profile-cache.ts` | In-memory + AsyncStorage profile cache |
| `lib/prefetch-country-profiles.ts` | Background prefetch (feed neighbors, touch warmup) |
| `constants/ai-explorer-theme.ts` | Screen-specific amber + surface tokens |
| `data/ai-explorer-content.ts` | Nigeria fallback country + legacy mock content helpers |

There is **no** `(tabs)/explore/ai-content.tsx` route. The explorer is always pushed as `app/country/[name]/ai-explorer`.

### Active components (used by the screen)

| Component | Responsibility |
| --------- | -------------- |
| `BlurredGlobeBackground` | Full-screen ambient blurred earth texture + navy scrim |
| `CountryProfileCard` | Main scroll content — orchestrates all profile sections |
| `CountryHeroCarousel` | Edge-to-edge horizontal image pager (~40% screen height) |
| `ExplorerBackButton` | Circular light back button overlaid on hero |
| `StatItem` | Value-first stat tile (Population, Capital, Region, Language, geography) |
| `ProfileSection` | Uppercase section label + children |
| `CountryLocationMap` | Equirectangular map crop centered on country; pulsing pin; "View on map" |
| `CountryLandmarksSection` | Landmark cards with images, descriptions, show-more toggle |
| `Divider` | Hairline dividers between stat rows and sections |

### Legacy components (present in repo, not wired to main screen)

These were built for an earlier dashboard design (category chips, 2×2 insights grid, trending carousel). They are **not** rendered by `ai-explorer.tsx` today:

- `ai-content-explorer-header.tsx`
- `country-hero-card.tsx`
- `category-tabs.tsx`, `category-tab-pager.tsx`
- `insight-card.tsx`, `trending-card.tsx`

Do not reintroduce them unless product explicitly revives that layout.

---

## CORE LAYOUT

The screen has **two layers**: fixed ambient background + scrollable profile body.

### 1. Screen shell (`ai-explorer.tsx`)

| Element | Spec |
| ------- | ---- |
| Background | `BlurredGlobeBackground` with `centerY={0.42}` |
| Scroll | `ScrollView`, transparent, `paddingBottom: 20` |
| Safe area | `SafeAreaView` with `edges={["bottom"]}` only — hero extends under status bar |
| Loading | Full-page `ActivityIndicator` when no country name is available yet |
| Main content | `CountryProfileCard` once country data exists |

No sticky "AI Content Explorer" header. Navigation back lives on the hero carousel.

### 2. Hero carousel (`CountryHeroCarousel`)

| Element | Spec |
| ------- | ---- |
| Height | ~40% of screen height (`HERO_HEIGHT_RATIO = 0.4`) |
| Images | Horizontal `FlatList`, paging, `country.images[]` via `getCountryImages` |
| Fallback | `images.earthTopography` when no remote images |
| Back button | `ExplorerBackButton` — top-left, safe-area offset |
| Bottom scrim | `LinearGradient` fade into profile panel |
| Counter | `{n}/{total}` bottom-right when multiple images |

### 3. Profile panel (`CountryProfileCard`)

Raised card overlapping hero (`marginTop: -36`, `borderTopRadius: 24`, `backgroundColor: AI_EXPLORER_THEME.surface`).

**Header row**

| Element | Data source |
| ------- | ----------- |
| Country name | `country.name` — Poppins Medium, auto-shrink |
| Flag chip | `FlagBadge` + "FLAG" label |

**Quick stats grid** (2×2 tile panel)

| Stat | Source |
| ---- | ------ |
| Population | `formatPopulation(country.population)` |
| Capital | `country.capital` |
| Region | `continentDisplayLabel(country.region)` |
| Language | `formatOfficialLanguages(country.languages)` |

**Sections** (in order, separated by `Divider`)

| Section | Content |
| ------- | ------- |
| Location | `CountryLocationMap` — tap calls `focusCountryOnMap` + `router.push("/(tabs)/map")` |
| Overview | Wikipedia `extract`; skeleton while refreshing; read more/less at 3 lines |
| Did you know? | First AI fact from `getProfileAiFacts(country)` — hidden if empty |
| Landmarks | `CountryLandmarksSection` — only when `landmarks.length > 0` |
| Geography | 4-row stat panel: coordinates, subregion, area, landlocked, timezone, hemisphere, climate, country code |
| Learn more | Wikipedia link via `expo-web-browser` — only when `wikipedia.pageUrl` exists |

---

## DESIGN SYSTEM

Screen tokens live in `constants/ai-explorer-theme.ts`:

| Token | Value / usage |
| ----- | ------------- |
| Accent | Amber `#fbbf24` — links, pin, call-to-action |
| Background | Navy `#0b132b` (globe background) + surface `#0f172a` (profile panel) |
| Raised surfaces | `rgba(255,255,255,0.04)` with hairline `divider` borders |
| Text | White primary; muted secondary at 48–82% opacity |
| Typography | Poppins — section labels 11px uppercase; body 13–14px |
| Motion | Reanimated pulse on location pin; RN `Animated` skeleton on overview load; press scale on back button |

### Styling rules

- Prefer **NativeWind** `className` where AGENTS.md allows (e.g. `ProfileSection` labels)
- Use **StyleSheet** / inline for: `BlurView`, `LinearGradient`, Reanimated, `ScrollView` content containers, platform shadows, `Pressable` pressed states, and AGENTS.md exceptions
- Do **not** put `className` on `SafeAreaView`

---

## IMPLEMENTATION RULES

- Functional components + hooks only
- TypeScript strict — no `any`
- Export screen as default from route file; main component name **`AIContentExplorerScreen`**
- Business logic in hooks/cache libs; screen orchestrates layout only
- Never call OpenAI or expose API keys from the app

---

## BEHAVIOR

### Country state (`useAiExplorerCountry`)

1. Read `name` from `useLocalSearchParams`
2. Resolve feed match from `useCountryFeedStore` (by name or current feed index)
3. Show cached profile immediately from `getCachedCountryProfile` (memory → disk)
4. Background refresh via `prefetchCountryProfile` → `GET /country/:name/profile`
5. Fallback: `NIGERIA_FALLBACK_COUNTRY` from `data/ai-explorer-content.ts` when no route/feed data

Return shape:

```ts
{
  country: Country;
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
  loading: boolean;    // true only when nothing to show yet
  refreshing: boolean; // background Wikipedia fetch
  error: string | null;
}
```

### Caching (`lib/country-profile-cache.ts`)

- Memory `Map` keyed by lowercase country name
- Persisted to AsyncStorage via `CLIENT_CACHE_KEYS.countryProfile` (30-day TTL)
- `seedCachedCountryProfile` merges feed country into cache on touch
- `isCountryProfileEnriched` — profile is "ready" when Wikipedia extract exists

### Prefetch (`lib/prefetch-country-profiles.ts`)

- `warmCountryProfileOnInteraction` — on `onPressIn` before navigation
- `ensureCountryProfileReady` — optional short wait (450ms) before push when cache not enriched
- Feed store prefetches neighbors (`PREFETCH_AHEAD` / `PREFETCH_BEHIND`) on scroll

### Navigation (`lib/open-country-ai-explorer.ts`)

| Function | When |
| -------- | ---- |
| `warmCountryAiExplorer(country)` | `onPressIn` on entry CTAs |
| `openCountryAiExplorer(country)` | `onPress` — records recently viewed, prefetches neighbors, pushes route |

**Entry points (implemented):**

- `components/explore/explore-footer.tsx` — footer tap on explore card
- `components/explore/country-feed-page.tsx` — feed page interaction
- `components/map/map-country-preview-card.tsx` — map bottom sheet CTA

### Data wiring

| UI element | Source |
| ---------- | ------ |
| Flag, name, capital, population, region, languages, geography | `Country` from profile endpoint or feed cache |
| Hero images | `country.images[]` via `getCountryImages` |
| Overview text | `wikipedia.extract` → fallback `ai.caption` / `ai.fact` → generic copy |
| Did you know? | `getProfileAiFacts(country)[0]` |
| Landmarks | `GET /country/:name/profile` → `landmarks[]` |
| Location map | `country.latlng` + `images.earthMap` equirectangular crop |
| Wikipedia link | `wikipedia.pageUrl` → `WebBrowser.openBrowserAsync` |

### Header / navigation actions

| Control | Behavior |
| ------- | -------- |
| Back (hero overlay) | `router.back()` |
| View on map (location section) | `focusCountryOnMap(country, "explore")` + push Map tab |
| Open on Wikipedia | In-app browser via `expo-web-browser` |

---

## DO NOT

- Do **not** rebuild the bottom tab bar inside this screen — stack route hides it
- Do **not** require a phone mockup frame
- Do **not** call AI APIs from the client
- Do **not** `require()` image assets in screens — use `constants/images.ts`
- Do **not** assume the old category-chip / insights-grid / trending layout is current — profile sections are the source of truth

---

## GOAL

This screen should feel like:

> _"A polished country profile where users deep-dive beyond the swipe feed — real photos, Wikipedia context, landmarks, geography, and an AI fact — with instant open thanks to prefetch and cache."_

---

## Out of scope

- Category chips, AI insights 2×2 grid, trending carousel (legacy components only)
- Sticky glass "AI Content Explorer" title header
- Real-time on-device AI regeneration
- Clerk auth, onboarding
- Interactive 3D globe in hero (static map preview in Location section only)
- News/explorer endpoint (`GET /country/:name/explorer`) — profile endpoint is used instead

---

## Acceptance criteria

- Route `app/country/[name]/ai-explorer.tsx` renders `AIContentExplorerScreen`
- Blurred globe background + scrollable profile panel
- Hero carousel shows country images (or topography fallback) with back button
- Quick stats show population, capital, region, language
- Overview loads Wikipedia extract with skeleton during refresh; read more works
- Landmarks section appears when backend returns landmarks
- Geography grid shows formatted coordinates, area, timezone, etc.
- Location map tap focuses country on Map tab
- Wikipedia "Learn more" opens when `pageUrl` is available
- `openCountryAiExplorer` / `warmCountryAiExplorer` wired from Explore and Map
- Profile cache hydrates from memory/disk before network; prefetch on feed scroll
- `npm run lint` passes; run `npm run typecheck` if available

---

## Testing

```bash
# Terminal 1 — backend + Redis per prompts-worldloop
# Terminal 2
npx expo start
```

1. From Explore — tap footer / learn-more CTA → explorer opens for current country
2. From Map — open country sheet → tap explorer CTA → same route with correct `name` param
3. Hero carousel — swipe images when multiple; back returns to previous screen
4. Overview — skeleton briefly, then Wikipedia text; read more expands
5. Landmarks — visible for countries with backend data (e.g. Japan, France); show-more toggles
6. Location — tap "View on map" → Map tab focuses country
7. Open with another country param — hero, overview, landmarks update
8. Stop backend — cached profile still renders; overview falls back to AI/generic copy
9. Second open of same country — instant render from cache (no full-page spinner)

---

## Next steps

1. Remove or repurpose legacy dashboard components if product confirms profile layout is final
2. Landmark detail screen (tap a landmark card)
3. Share / bookmark actions from profile header
4. Pull-to-refresh on profile scroll
5. Offline indicator when `refreshing` fails with stale cache
