Read AGENTS.md first and follow it strictly.

Reference: `prompt_material/ai-content-explorer-ui.png`, `AGENTS.md` (data model, styling rules), `prompts/02-design-theme.md`, `prompts/08-zustand.md`, `prompts/09-bottom-tab-nav.md`, `prompts-worldloop/04-ai-content-service.md`

Build a React Native (Expo + TypeScript) screen called **`AIContentExplorerScreen`** based on a futuristic **“AI Country Explorer”** UI.

This screen is part of **WorldLoop** — a 3D globe-based world intelligence app.

The UI must match a premium dark, **glassmorphism**, spatial dashboard style (Vision Pro / Apple spatial UI inspired). Match layout, typography, colors, radii, glow effects, and spacing **pixel-for-pixel** against the attached reference — do not simplify the design.

Use assets from `assets/` via the centralized `constants/images.ts` import (`import { images } from "@/constants/images"`). Add any new bundled assets there before using them in screens or components.

@prompt_material/ai-content-explorer-ui.png

---

## Goal

Implement a scrollable **AI Content Explorer** dashboard where a selected country feels like a **data-rich living entity**:

- Sticky glass header with back navigation
- Featured **Country Hero Card** with stats and embedded globe preview
- Horizontal **category chips** that filter insight content
- **2×2 AI Insights grid** with category-tinted glass cards
- **Trending in {Country}** horizontal carousel
- Screen sits above the existing custom tab bar (do **not** rebuild bottom nav unless this route is standalone)

Wire real country + AI data from existing stores/API where possible. Use mock insight/trending copy for v1 when backend does not yet expose category-specific AI payloads.

---

## Prerequisites

- `prompts/01-nativewind.md` and `prompts/02-design-theme.md` — theme tokens in `global.css`, Poppins fonts loaded
- `prompts/08-zustand.md` — `store/use-country-feed-store.ts`, `lib/api.ts`, `types/country.ts`
- `prompts/09-bottom-tab-nav.md` — `(tabs)` routes and `components/bottom-tab-bar.tsx` exist
- Backend feed running (`GET /feed/countries`) with enriched countries (`images`, `ai.fact` when available)
- `prompts-worldloop/04-ai-content-service.md` — AI fields on country objects (`ai.fact`, `ai.caption`, `ai.facts[]`)

Recommended (not blocking):

- `prompts/12-map-ui.md` or `13-map-v2-3d-globe.md` — reuse globe preview styling patterns if available
- `prompts/10a-explore-ui.md` — consistent country metadata formatting

---

## Dependencies

Use what is already installed:

- `expo-router`, `expo-image`, `expo-blur` (for glass surfaces)
- `expo-linear-gradient` (gradients on cards/chips — use if already in project; otherwise teachable `View` + opacity layers)
- `zustand`, `@react-native-async-storage/async-storage`
- `@expo/vector-icons`
- `react-native-reanimated` — press scale, chip selection, fade-in on filter change
- `react-native-safe-area-context`

Do **not** add external UI kits (NativeBase, Paper, etc.), React Query, or axios without user approval.

---

## Route & files

| Path                                 | Purpose                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `app/country/[name]/ai-explorer.tsx` | **Preferred** — pushed from map/explore “Learn more” / country focus; receives country name param |
| `app/(tabs)/explore/ai-content.tsx`  | **Alternative** — if embedded in Explore stack; pick one route and document in code comment       |
| `components/ai-explorer/`            | Reusable UI blocks (extract when screen stays readable)                                           |

### Required reusable components

| Component                 | Responsibility                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `GlassCard`               | Base glassmorphism container — blur, translucent fill, soft border glow, rounded corners |
| `StatItem`                | Icon + label + value row (Population, Languages, Capital)                                |
| `CategoryChip`            | Pill chip with icon; active/inactive visual states                                       |
| `InsightCard`             | Grid tile — icon, title, AI summary, optional image footer                               |
| `TrendingCard`            | Horizontal card — image, gradient overlay, title                                         |
| `AIContentExplorerHeader` | Sticky blur header — back, title, subtitle, action button                                |
| `CountryHeroCard`         | Composes flag, name, region pill, description, globe preview, stats row                  |

Keep business logic in hooks/stores; the screen orchestrates layout, scroll, and filter state.

---

## 🧠 CORE LAYOUT

The screen has **6 main sections** (scrollable body + fixed chrome):

### 1. HEADER (Sticky)

| Element       | Spec                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| Title         | **AI Content Explorer** — large, bold, white, centered                          |
| Subtitle      | **Powered by AI. Curated for you.** — smaller, muted gray-white                 |
| Back button   | Top-left — circular glass container, chevron/arrow icon                         |
| Action button | Top-right — circular glass container, **+** icon (v1: no-op or `Alert`)         |
| Background    | `BlurView` (`expo-blur`) + translucent navy overlay; fades into page background |

Implementation:

- Use `Animated.ScrollView` or `ScrollView` with sticky header pattern (`stickyHeaderIndices` or absolute positioned header with scroll offset)
- Respect top safe area; **do not** put `className` on `SafeAreaView` (use inline styles per AGENTS.md)

---

### 2. COUNTRY HERO CARD (PRIMARY FOCUS)

Large featured card — default country: **Nigeria** (until route param / store provides another).

**Left column**

| Element      | Spec                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Flag         | Small flag image via `FlagBadge` or `country.flag` URL — not plain emoji unless design uses emoji                                                                                                                  |
| Country name | Large bold white (e.g. **Nigeria**)                                                                                                                                                                                |
| Region pill  | Dark green background, light green text (e.g. **West Africa**) — use `country.region`                                                                                                                              |
| Description  | Short AI-generated line, e.g. _“Discover real-time insights about Nigeria across economy, culture, people and more.”_ — derive from `ai.caption` or trimmed `ai.fact`; fallback to mock copy keyed by country name |

**Right column**

| Element       | Spec                                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Globe preview | Small embedded **static placeholder `View`** for v1 — rounded, shows Africa-focused globe image or simplified map silhouette with **glowing green pin** over country |
| Pin glow      | Soft green pulse ring around pin (Reanimated loop optional)                                                                                                          |

**Stats row** (bottom of card, three columns)

| Stat       | Icon                   | Example (Nigeria) | Data source                                            |
| ---------- | ---------------------- | ----------------- | ------------------------------------------------------ |
| Population | people / users         | **227M**          | `formatPopulation(country.population)`                 |
| Languages  | translate / characters | **500+**          | Mock for v1 (`"500+"`) or static map per country later |
| Capital    | star / pin             | **Abuja**         | `country.capital`                                      |

**Card design**

- Glassmorphism: `rgba(255,255,255,0.06)` fill + blur
- Soft **cyan/green glow border** (1px rgba white + outer shadow/glow)
- Subtle diagonal or radial gradient tint inside card
- Border radius **20–24px**
- Internal padding: **16–24px** on 8pt grid

---

### 3. CATEGORY CHIPS (HORIZONTAL SCROLL)

Horizontally scrollable pills:

| Chip                          | Icon (suggested) |
| ----------------------------- | ---------------- |
| **Overview** (default active) | sparkle          |
| Culture                       | masks / theater  |
| Economy                       | bar chart        |
| People                        | person           |
| Trending                      | fire             |

**Active chip**

- Cyan-to-green gradient background (`--color-teal-cyan` → `--color-success`)
- White icon + label
- Slightly larger scale (`1.05`) + subtle glow

**Inactive chip**

- Dark glass background (`bg-white/5` + blur optional)
- White/muted icon + text
- Thin rgba border

**Behavior**

- `selectedCategory` in local state (default `"overview"`)
- Tapping a chip updates filter and animates scale on active chip
- Filter affects **AI Insights grid** (mock mapping allowed — see Behavior section)

---

### 4. AI INSIGHTS GRID (MAIN CONTENT)

**Section header**

| Left                                      | Right                                           |
| ----------------------------------------- | ----------------------------------------------- |
| **AI Insights** + small blue sparkle icon | **Updated just now** + glowing green status dot |

**Grid layout:** 2 columns, 2 rows (4 cards). Gap **12–16px**. Each card ~equal height, image occupies bottom ~40–50%.

| Card           | Icon tint   | Title          | Example summary (Nigeria mock)               | Image                    |
| -------------- | ----------- | -------------- | -------------------------------------------- | ------------------------ |
| Economy        | Green       | Economy        | GDP growth ~3.2%, diversification beyond oil | City skyline sunset      |
| Culture        | Purple      | Culture        | Nollywood, Afrobeats global influence        | Traditional attire photo |
| People         | Yellow/gold | People         | 250+ ethnic groups, young population         | Group portrait           |
| Current Events | Blue        | Current Events | Infrastructure, tech startup momentum        | Modern bridge at night   |

**Each card**

- `InsightCard` with glassmorphism + **category gradient tint** (green / purple / gold / blue at ~8–12% opacity)
- Icon in tinted circle top-left
- Title bold white; summary 2–3 lines muted white
- Bottom: `expo-image` with `contentFit="cover"` — use `country.images[n]` or category placeholder from `constants/images.ts`
- Press: Reanimated scale `0.97 → 1` on press in/out

**Filtering (v1)**

- **Overview** — show all 4 cards
- **Culture / Economy / People** — show matching card full-width or highlight matching card (simplest teachable approach: filter list to matching category)
- **Trending** — scroll user to Trending section or show trending-only insight cards

---

### 5. TRENDING SECTION

**Section header**

| Left                                                | Right                                  |
| --------------------------------------------------- | -------------------------------------- |
| **Trending in {Country}** + green upward arrow icon | **View all >** link (gold/cyan accent) |

**Horizontal scroll** — square-ish cards (~140–160px wide), rounded **16–20px**.

| Card | Title overlay                   |
| ---- | ------------------------------- |
| 1    | Tech startups on the rise       |
| 2    | Sports driving national pride   |
| 3    | Cuisine winning hearts globally |
| 4    | Tourism spots to explore        |

**Each `TrendingCard`**

- Full-bleed background image (remote URL or placeholder)
- Bottom **dark gradient overlay** for text legibility
- White title text, 2 lines max
- Optional subtle press scale

Data: mock array keyed by `country.name` for v1; structure typed for future API.

---

### 6. BOTTOM NAVIGATION (FIXED)

**If this screen lives inside `(tabs)` layout:** use the existing `components/bottom-tab-bar.tsx` — **do not duplicate** tab bar markup inside the screen. Add bottom scroll padding (`pb-28` + safe area) so content clears the bar.

**Design reference (from mock):** Explore active (cyan globe), Feed, center **Globe** FAB (large, glowing cyan ring), Saved, Profile.

**Project tab mapping** (match existing routes from `prompts/09-bottom-tab-nav.md`):

| Design label   | WorldLoop route                           | Notes                                                                |
| -------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Explore        | `/(tabs)/explore`                         | Active state uses cyan/teal accent in this screen’s design reference |
| Feed           | `/(tabs)/index` (Home) or future Feed tab | Use Home until dedicated Feed exists                                 |
| Globe (center) | `/(tabs)/map`                             | Elevated circular button — already in custom tab bar                 |
| Saved          | `/(tabs)/saved`                           |                                                                      |
| Profile        | `/(tabs)/profile`                         |                                                                      |

If this screen is a **stack modal** (`app/country/[name]/ai-explorer.tsx`), hide tab bar via stack options and show only the sticky header back button.

---

## 🎨 DESIGN SYSTEM

Align with `global.css` tokens and extend only when needed:

| Token                  | Value / usage                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| Background             | Deep navy / near-black gradient — `--color-midnight-navy` (#0b132b) base with subtle radial purple/cyan washes |
| Primary accent         | Cyan / teal glow — `--color-teal-cyan` (#00d4c7)                                                               |
| Secondary              | Purple highlights — `--color-aurora-purple` (#7b61ff)                                                          |
| Success / region pills | `--color-success` (#22c55e)                                                                                    |
| Glass fill             | `rgba(255,255,255,0.06)`                                                                                       |
| Glass border           | `rgba(255,255,255,0.10–0.14)`                                                                                  |
| Blur intensity         | `BlurView` intensity ~40–80 (tune per platform)                                                                |
| Corner radius          | Cards **16–24px**; chips **full pill**; hero **20–24px**                                                       |
| Typography             | Poppins via existing font utilities (`h2`, `h3`, `h4`, `body-md`, `caption`)                                   |
| Shadows                | Soft colored glows (cyan/green), not harsh black drop shadows                                                  |
| Motion                 | Fade + scale on chip change and card press; optional subtle hero pin pulse                                     |

### Spacing

- Use **8pt grid** throughout (8, 16, 24, 32)
- Minimum touch targets **44×44**

### Styling rules

- Prefer **NativeWind** `className` for static layout and typography
- Use **StyleSheet** / inline for: `BlurView`, `LinearGradient`, Reanimated styles, `ScrollView` content containers, platform shadows, `Pressable` pressed states, and AGENTS.md exceptions
- Add reusable glass utilities to `global.css` only if the same pattern repeats 3+ times (BEM-style, e.g. `.glass-card`)

---

## ⚙️ IMPLEMENTATION RULES

- Functional components + hooks only
- TypeScript strict — no `any`
- No external UI libraries unless necessary
- **`react-native-reanimated`** for animations (chip scale, card press, section fade)
- **`expo-blur`** for glass header and optionally hero/insight cards
- Centralize mock insight/trending data in `data/ai-explorer-content.ts` (typed, keyed by country name or `cca2`)
- Export screen as default from route file; name the main component **`AIContentExplorerScreen`**

---

## 🧠 BEHAVIOR

### Country state

- Default country: **Nigeria** (hardcoded fallback matching design)
- Preferred: read `countryName` from route params (`useLocalSearchParams`) or `useCountryFeedStore` selected country
- Switching country updates:
  - Hero card (flag, name, region, stats, description)
  - AI Insights summaries (from mock map or `ai.facts[]` slices)
  - Trending section title and cards
  - Globe preview pin position (static image offset per region for v1)

### Category filter

- Local state: `CategoryId = "overview" | "culture" | "economy" | "people" | "trending"`
- Mock filtering allowed — map categories to insight card IDs
- Animate grid re-layout with `LayoutAnimation` or Reanimated entering/exiting

### Data wiring

| UI element                              | Source                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Flag, name, region, capital, population | `Country` from feed store or `GET /country/:name`                                         |
| Hero description                        | `country.ai?.caption` or trimmed `country.ai?.fact`                                       |
| Insight summaries                       | v1: `data/ai-explorer-content.ts`; stretch: split `country.ai?.facts[]` across categories |
| Insight / trending images               | `country.images[]` rotation or placeholders                                               |
| “Updated just now”                      | Static label for v1; optional `Date` from cache metadata later                            |

Never call OpenAI or expose API keys from the app — AI text comes from backend only.

### Header actions

| Control | v1 behavior                                                   |
| ------- | ------------------------------------------------------------- |
| Back    | `router.back()`                                               |
| **+**   | Placeholder — `Alert` or navigate to save/bookmark flow later |

---

## 🚫 DO NOT

- Do **not** wrap UI in a phone mockup frame
- Do **not** use web CSS (`backdrop-filter` in StyleSheet strings, etc.) — use RN + expo-blur
- Do **not** ship flat, boring, white-background admin UI
- Do **not** place this dashboard **inside** the 3D globe scene — globe is a **small preview** in the hero card only
- Do **not** rebuild the bottom tab bar inside this screen when `(tabs)` layout already provides it
- Do **not** simplify glass effects, glows, or gradients to plain gray boxes
- Do **not** `require()` image assets directly in the screen — use `constants/images.ts`

---

## 🎯 GOAL

This screen should feel like:

> _“A futuristic AI-powered world intelligence interface where users explore countries like data-rich living entities.”_

Users land here from **Explore**, **Map country focus**, or **Home “Learn more”** to deep-dive a country beyond the TikTok-style swipe feed.

---

## Out of scope

- Real-time AI regeneration on device
- Backend endpoints for category-specific insights (use mocks + existing `ai.facts[]` until added)
- Full **Feed** tab (separate from Home) unless product adds route later
- Interactive 3D globe in hero (static placeholder / image only for this prompt)
- Clerk auth, onboarding
- Persisting last-selected category to AsyncStorage (optional stretch)

---

## Acceptance criteria

- Screen matches `prompt_material/ai-content-explorer-ui.png` layout and visual tone (dark glass spatial UI)
- Sticky glass header with title, subtitle, back, and action button
- Country hero card shows flag, name, region pill, AI description, globe preview placeholder, and three stats
- Category chips scroll horizontally; active chip has gradient glow and scale
- AI Insights 2×2 grid renders four category cards with icons, summaries, and image footers
- Trending horizontal section shows country-specific title and four cards with gradient overlays
- Changing country (param or dev control) updates hero, insights, and trending content
- Chip filter updates visible insights (mock filtering acceptable)
- Content scrolls above existing tab bar with correct bottom padding OR stack screen hides tab bar cleanly
- Press animations on chips and cards use Reanimated
- `npm run lint` passes; run `npm run typecheck` if available
- No new major dependencies without user approval

---

## Testing

```bash
# Terminal 1 — backend + Redis per prompts-worldloop
# Terminal 2
npx expo start
```

1. Navigate to AI Content Explorer (route under test) — default **Nigeria** hero renders
2. Scroll — header stays sticky/blurred; sections match design order
3. Tap category chips — active styling updates; insights filter or scroll behavior works
4. Press insight and trending cards — scale animation fires
5. Open with another country param (e.g. Japan) — hero + trending title update
6. Verify bottom content is not hidden behind tab bar (or back navigation works on stack route)
7. Stop backend — screen still renders with mock fallbacks where API data missing

---

## Next steps

After this prompt:

1. Backend category insights endpoint (extend `04-ai-content-service.md`)
2. Wire navigation from Explore **Learn More** and Map country focus pill
3. Replace hero globe placeholder with live map snapshot or shared globe component
4. Hook **View all** trending to a full list screen
