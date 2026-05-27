Read AGENTS.md first and follow it strictly.

Parent: [`13-map-v2-3d-globe.md`](./13-map-v2-3d-globe.md) · Previous: [`13b-map-v2-globe-data-pins.md`](./13b-map-v2-globe-data-pins.md)

Reference: `prompt_material/map-screen-ui.png` (chrome + bottom card — reuse from v1)

## Step 3 — UX features

**Goal:** Match v1 Map **product behavior** on top of the stable globe from Steps 1–2.

Implement **only after** real pins and selection work:

- Full **country preview card** (stats, AI fact, Save, Explore Country)
- **Selected pin** gold highlight / pulse
- **Random Country** FAB + **camera animation** to face pin
- Optional: **2D ↔ 3D toggle**, map control overlays, tap empty space to dismiss

## Prerequisites

- [`13b-map-v2-globe-data-pins.md`](./13b-map-v2-globe-data-pins.md) **completed**
- `prompts/10c-search-ui.md` — search overlay + `openCountryInExplore`
- Backend running for `GET /country/:name`

## Files to create / touch

| Path                                   | Purpose                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `components/map/map-canvas.tsx`        | Renders `GlobeView` or v1 `MapView` from `mapMode`          |
| `components/map/globe-view.tsx`        | Selection styling, `focusCountryOnGlobe`, dismiss tap       |
| `components/map/globe-country-pin.tsx` | Selected scale + emissive gold; optional ring               |
| `components/map/map-controls.tsx`      | Zoom +/-, compass reset for 3D (adapt v1 overlays)          |
| `store/use-map-store.ts`               | `mapMode`, `setMapMode`, `focusCountryOnGlobe(name)`        |
| `app/(tabs)/map.tsx`                   | Full wiring: card, FAB, header globe icon, search unchanged |

Keep v1 components unchanged except wiring: `MapCountryPreviewCard`, `RandomCountryFab`, `MapHeader`, `SearchOverlay`.

## Selection + preview card

Same as v1:

- `selectCountry(name)` → `fetchCountryByName` for AI block in preview card
- Card UI — **copy from v1**; do not redesign
- Tap empty globe space → optional `selectCountry(null)` to dismiss card

## Selected pin (visual)

- **Selected:** scale up + brighter emissive gold + optional ring
- Match Peru / gold emphasis from 2D design, adapted to 3D
- **Trending:** badge in preview card only (same list as v1: `constants/trending-countries.ts`) — avoid DOM inside `Canvas`

## Camera animation

`focusCountryOnGlobe(name)`:

- Resolve country `latlng` → target on sphere
- Animate `OrbitControls` target + camera so pin faces the user
- Used by: pin selection (optional subtle nudge), **Random Country** FAB (required)

Keep animation short and interruptible if user drags mid-flight.

## Integrations (unchanged from v1)

| Action          | Implementation                                  |
| --------------- | ----------------------------------------------- |
| Save            | `useSavedCountriesStore.toggleSaved`            |
| Explore Country | `openCountryInExplore(detailOrMinimalCountry)`  |
| Search bar      | `useSearchUiStore` + `SearchOverlay`            |
| Random Country  | `selectRandomCountry()` + `focusCountryOnGlobe` |
| Trending badge  | `constants/trending-countries.ts`               |

No new backend routes.

## 2D ↔ 3D toggle (recommended)

- `useMapStore.mapMode`: `"2d" | "3d"` (default `"3d"` after v2 ships, or `"2d"` until flipped — document choice)
- Header left **globe icon** → `setMapMode`
- `map-canvas.tsx`:
  - `"2d"` → v1 `react-native-maps` `MapView`
  - `"3d"` → `GlobeView`
- Persist `mapMode` in AsyncStorage (optional stretch)

## Map controls (3D)

| Control         | 3D behavior                                           |
| --------------- | ----------------------------------------------------- |
| Zoom +/-        | Adjust `OrbitControls` min/max distance or camera FOV |
| Compass / reset | Reset camera to default world-facing pose             |
| Legend          | Same stub as v1 (“Gold pins = countries”)             |

Position controls over `GLView` with absolute layout (NativeWind on wrapper `View`, not on `GLView`).

## UI chrome (reuse v1 — do not redesign)

Match `map-screen-ui.png` for everything **except** the map viewport:

- Header, title, subtitle, search, filter chips, preview card, FAB, tab bar spacing
- 8pt grid, gold `#fbbf24` accents, dark backgrounds
- `constants/images.ts` for logo and avatar

Users should not lose any v1 actions: search, save, explore, random country, trending badge on select pins.

## Acceptance criteria

- [ ] Tapping a pin opens the **same** preview card as v1 with correct stats
- [ ] AI fun fact loads via `GET /country/:name` after selection
- [ ] Save, Explore Country, Search overlay behave like v1
- [ ] **Random Country** FAB selects random pin + **animates camera** to face it
- [ ] Selected pin has visible **gold emphasis**
- [ ] 2D ↔ 3D toggle works if implemented (both modes usable)
- [ ] Map controls work in 3D mode (zoom / reset at minimum)
- [ ] Loading / error states do not crash GL view
- [ ] `npm run lint` passes
- [ ] Tested on physical device OR documented simulator limitation

## Testing

```bash
# Terminal 1 — backend + Redis
# Terminal 2
npx expo start
```

1. Open **Map** — globe + countries loaded
2. Spin + zoom — smooth (regression from Step 1)
3. Tap **Japan** — preview card + AI fact; pin highlighted
4. Tap **Explore Country** — Explore opens on that country
5. Tap **Random Country** — new selection + camera faces pin
6. Toggle **2D** (if built) — flat map works; toggle back to 3D
7. Open search → pick country → Explore (unchanged)
8. Stop backend — map error UI; GL does not white-screen

## Next steps (post v2)

See parent [`13-map-v2-3d-globe.md`](./13-map-v2-3d-globe.md):

- Persist `mapMode` + camera pose
- Region chip filters hide/show pin subsets
- Saved countries screen
- Optional globe texture asset
