Read AGENTS.md first and follow it strictly.

Reference: `prompt_material/map-screen-ui.png`, `AGENTS.md` (Map Screen Rules), `prompts/08-zustand.md`, `prompts/09-bottom-tab-nav.md`, `prompts/10a-explore-ui.md`, `prompts/10c-search-ui.md`, `prompts-worldloop/07-map-endpoint.md`

Implement the **Map** tab UI on `app/(tabs)/map.tsx` exactly as shown in the attached design. Use precise **8-point spacing** throughout (8, 16, 24, 32, …). Match layout, typography, colors, radii, map chrome, and the bottom country preview card pixel-for-pixel — do not simplify the design.

Use assets from `assets/` via the centralized `constants/images.ts` import (`import { images } from "@/constants/images"`). Add any new image assets there before using them in screens or components.

@prompt_material/map-screen-ui.png

## Goal

Replace the Map placeholder with an **interactive world map** discovery screen:

- Full-screen dark map with gold-accent markers and selected-country highlight
- Header: globe affordance, WorldLoop logo, profile avatar
- Title block: **World Map** + subtitle (“Explore the world, one loop at a time.”)
- Search bar + filter icon (reuse existing search overlay pattern)
- Horizontal filter chips (All, Population, Culture, Nature, History)
- Tap a country marker → bottom **country preview card** (flag, stats, AI fun fact, Save, **Explore Country**)
- Map controls: location/compass, zoom +/-, legend affordance
- **Random Country** FAB (dice icon) — picks a random marker and selects it
- Wire to `GET /map/countries` for markers; load full `Country` (images + AI) on selection when needed

## Prerequisites

- `prompts/09-bottom-tab-nav.md` — `(tabs)` routes and custom `components/bottom-tab-bar.tsx`; center **Map** globe tab works
- `prompts/08-zustand.md` — `types/country.ts`, `constants/api.ts`, `lib/api.ts`, saved countries store
- `prompts/10a-explore-ui.md` — Explore feed exists so **Explore Country** has a real destination
- `prompts/10c-search-ui.md` — `SearchOverlay`, `useSearchUiStore`, `openCountryInExplore` (reuse for search + CTA)
- `prompts-worldloop/07-map-endpoint.md` — backend `GET /map/countries` running; `lib/api.ts` exports `fetchMapCountries`
- `prompts/01-nativewind.md` and `prompts/02-design-theme.md` — theme tokens in `global.css`, Poppins fonts loaded

## Dependencies

### Already installed (use these)

- `expo-router`, `expo-image`
- `zustand`, `@react-native-async-storage/async-storage`
- `@expo/vector-icons`
- `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated`

### Map library (required — ask user first)

The design requires a **real interactive map** (pan, zoom, markers). This is not in `package.json` yet.

**Ask the user for approval**, then install:

```bash
npx expo install react-native-maps
```

Use a **dark custom map style** (land muted, water darker) to match `map-screen-ui.png`. Follow Expo’s dev-client / simulator notes if the map does not render on web.

Do **not** add Mapbox, Google Maps SDK keys in the client, React Query, axios, or clustering libraries without user approval.

## Route & files

| Path | Purpose |
| ---- | ------- |
| `app/(tabs)/map.tsx` | Map screen — composes map, header, chips, preview card, FAB |
| `store/use-map-store.ts` | Map countries list, load status, `selectedCountry`, selection helpers |
| `lib/api.ts` | Keep `fetchMapCountries`; add `fetchCountryByName(name)` → `Country` for bottom-sheet AI |
| `components/map/` (optional) | Extract when it keeps `map.tsx` readable: e.g. `MapHeader`, `MapFilterChips`, `MapCountryMarker`, `MapCountryPreviewCard`, `MapControls`, `RandomCountryFab` |

Keep business logic in the store and `lib/api.ts`; the screen orchestrates layout and gestures.

## Data wiring

### Map list (`GET /map/countries`)

On mount, call `fetchMapCountries()` from `lib/api.ts`.

Response shape (already typed as `MapCountry` in `types/country.ts`):

```ts
type MapCountry = {
  name: string;
  capital: string;
  region: string;
  population: number;
  flag: string;
  latlng: [number, number];
  image: string | null;
};
```

Store in `useMapStore`:

- `countries: MapCountry[]`
- `status: "idle" | "loading" | "error"`
- `error: string | null`
- `selectedCountry: MapCountry | null`
- `loadMapCountries()` — fetches once (or refetch on retry)
- `selectCountry(name: string | null)` — sets selection; animates map region optional
- `selectRandomCountry()` — random item from `countries`

Show a subtle loading state over the map while `status === "loading"`. On error, show retry UI with `error` message.

### Full country detail (`GET /country/:name`)

The map list is **lightweight** (no `ai` in the list). When the user selects a country for the bottom card:

1. Show immediately from `MapCountry`: flag, name, capital, region, population, `image` thumbnail
2. Fetch full `Country` in the background via `fetchCountryByName(name)` for `ai.fact` (and richer `images` if needed)
3. While detail loads, show placeholder: “Fun fact loading…”
4. On failure, keep stats visible; show a short inline error for the fact only

Add to `lib/api.ts`:

```ts
export async function fetchCountryByName(name: string): Promise<Country> {
  const encoded = encodeURIComponent(name.trim());
  const response = await fetch(`${API_BASE_URL}/country/${encoded}`);
  if (!response.ok) {
    throw new Error(`Country request failed (${response.status})`);
  }
  return response.json() as Promise<Country>;
}
```

Never call OpenAI from the app — AI text comes from the backend only.

### Saved countries (`useSavedCountriesStore`)

- Preview card bookmark icon → `toggleSaved(country)`  
  Map selection may only have `MapCountry`; when saving, pass a `Country`-shaped object (minimal fields: `name`, `capital`, `region`, `population`, `flag`, `latlng`, optional `images` from detail fetch) or fetch detail first — match how Home/Explore save works
- Reflect `isSaved(country.name)` (outline vs filled bookmark, gold when saved)

### Explore Country CTA

Reuse `openCountryInExplore` from `lib/open-country-in-explore.ts`:

- Requires a full `Country` — use the fetched detail object when available; otherwise build a minimal `Country` from `MapCountry` + `image` as `images: [image]` so Explore can open immediately
- Closes search if open, focuses country in feed, records recently viewed, navigates to `/(tabs)/explore`

### Search on Map

- Tapping the search bar opens the same **search overlay** as Home/Explore (`useSearchUiStore` + `SearchOverlay`)
- Do not duplicate search UI inside `map.tsx`
- Filter icon: v1 → `Alert` or no-op; advanced map filters are out of scope

## UI breakdown (match `map-screen-ui.png`)

### Layout

- **Full-screen** dark immersive screen; map fills the area behind header and bottom card
- Respect safe area for header; bottom preview card sits **above** the custom tab bar (`pb-28` or safe-area inset)
- Tab bar comes from `(tabs)/_layout.tsx` — do not rebuild

### Header

| Position | Element |
| -------- | ------- |
| Left | Globe icon (decorative or opens map region reset) |
| Center | WorldLoop wordmark — `images.worldloopIcon` from `constants/images.ts` |
| Right | Profile avatar — `images.profileAvatar`; tap → `router.push("/(tabs)/profile")` (same as Home) |

Below header:

- **World Map** — large white bold title (`h2` or design-matched size)
- Subtitle — light gray: “Explore the world, one loop at a time.”

### Search & filters

- Rounded dark search field: magnifying glass + placeholder “Search countries, regions, cultures…”
- Square filter button to the right (sliders icon)
- Horizontal **scrollable chips**: All (selected = gold border + globe), Population, Culture, Nature, History — each with a small icon

**v1 chip behavior:**

| Chip | Behavior |
| ---- | -------- |
| All | Show all map markers |
| Population / Culture / Nature / History | Visual selection only **or** simple client filter (e.g. Population = top 20% by `population`) — document choice in PR; backend has no map filter params |

### Interactive map

- `react-native-maps` `MapView` with `customMapStyle` for dark/gold aesthetic
- One `Marker` per `MapCountry` with valid `latlng`
- **Selected marker:** gold ring / highlighted callout (match Peru treatment in design)
- **Trending badge** on some markers (flame + “Trending”): v1 use a small hardcoded name list in `constants/trending-countries.ts` (e.g. Japan, Brazil, Iceland, Canada, South Africa, Peru) — no backend field required
- Optional: show country name + flag in a compact callout when zoomed in; hide when crowded

### Map controls (overlay on map)

| Control | v1 behavior |
| ------- | ----------- |
| Compass / location | Re-center map on user location **or** reset to world view (no GPS permission required for v1 — default world view is fine) |
| Zoom +/- | `animateToRegion` with adjusted latitudeDelta |
| Legend | Bottom sheet stub or `Alert` (“Gold markers = countries”) |

Use **StyleSheet** / inline styles for `MapView`, `Marker`, and animated region — per `AGENTS.md` map exception.

### Country preview card (bottom sheet style)

Shown when `selectedCountry` is set; rounded top corners, dark card over map:

| Area | Content |
| ---- | ------- |
| Left | Square thumbnail — `image` via `expo-image`, `contentFit="cover"`; flag fallback if null |
| Header row | Flag + **country name** + Trending pill if in trending list |
| Top right | Save / bookmark (wired to `useSavedCountriesStore`) |
| Stats row | Population (compact, e.g. `33.7M`), Capital, Region — three columns with icons |
| AI block | Sparkle + “AI Fun Fact” label + `countryDetail.ai?.fact` or loading placeholder |
| CTA | Full-width gold **Explore Country** button with arrow → `openCountryInExplore` |

Dismiss selection: tap map away from markers or swipe card down (optional stretch).

### Random Country FAB

- Circular gold button, bottom-right above tab bar, dice icon
- Label below: “Random Country”
- `selectRandomCountry()` then animate map to that `latlng`

### Spacing & typography

- **8pt grid** for padding, gaps, and 44×44 touch targets
- White primary text; gold `#fbbf24` / `text-tab-active` for accents, selected chip, CTA, FAB
- Reuse utilities from `global.css` where they match the design

### Styling rules

- Prefer **NativeWind** `className` for header, chips, preview card, FAB
- Use **StyleSheet** / inline for: `MapView`, `Marker`, `MapView` region animations, shadows, `Pressable` pressed states, and `AGENTS.md` exceptions
- Do **not** put `className` on `SafeAreaView` from `react-native-safe-area-context`

## Images

- Marker thumbnails and preview card: `MapCountry.image` or full `Country.images[0]` after detail fetch
- Bundled assets (logo, avatar) via `constants/images.ts` only
- Flags: use `country.flag` URL from API (`flagcdn`); helper `lib/flag-url.ts` if normalizing

## Out of scope

- Server-side marker clustering (`prompts-worldloop/07-map-endpoint.md` optional stretch)
- Real-time trending scores from backend
- Clerk auth changes
- **Saved** tab grid UI (`saved-screen-ui.png`)
- Replacing Explore or Home screens
- Map search filters backed by new API endpoints
- 3D globe / WebGL map engines
- Persisting last map camera position (optional stretch)

## Acceptance criteria

- Map tab shows the full design layout (not placeholder copy) when `GET /map/countries` succeeds
- All countries with valid coordinates render as tappable markers
- Tapping a marker opens the bottom preview card with correct stats
- AI fun fact loads from `GET /country/:name` after selection (with loading + error handling)
- Save toggles bookmark state via `useSavedCountriesStore`
- **Explore Country** opens Explore focused on that country (`openCountryInExplore`)
- Search bar opens the shared search overlay; choosing a result can land on Explore (existing behavior)
- Random Country FAB selects and focuses a random marker
- Loading and error states do not crash the screen
- `npm run lint` passes (run `npm run typecheck` if available)
- `react-native-maps` only added after user approval

## Testing

```bash
# Terminal 1 — backend + Redis per prompts-worldloop
# Terminal 2
npx expo start
```

1. Open **Map** tab (center globe) — markers load after API responds
2. Pan and zoom the map — controls work; dark style visible
3. Tap **Japan** (or any marker) — preview card shows; AI fact appears after detail fetch
4. Tap **Save** — country appears in saved store; icon updates
5. Tap **Explore Country** — app switches to Explore with that country focused
6. Tap search — overlay opens; pick a country — lands in Explore (existing search flow)
7. Tap **Random Country** — map animates to a new selection
8. Stop backend — error/retry UI on map load; recovery when backend returns

## Next steps

After this prompt:

1. `prompts/13-map-v2-3d-globe.md` — upgrade map canvas to interactive 3D globe
2. Saved countries screen (`prompt_material/saved-screen-ui.png`)
3. Country detail route (if separate from Explore)
4. Map chip filters backed by search/stats APIs (optional)
5. Persist map camera + last selection in AsyncStorage (optional)
