Read AGENTS.md first and follow it strictly.

Reference: `prompt_material/map-screen-ui.png` (chrome + bottom card — reuse from v1), `prompts/12-map-ui.md`, `AGENTS.md` (Map Screen Rules), `prompts-worldloop/07-map-endpoint.md`

Implement **Map v2**: replace the **2D map canvas** from `prompts/12-map-ui.md` with an **interactive 3D globe** while keeping the same header, search, filter chips, country preview card, FAB, and data wiring. Visual language stays **dark + gold** (WorldLoop brand).

This is an **upgrade prompt**, not a greenfield Map screen. Do not rebuild Explore, Home, or backend endpoints.

## Goal

Give the Map tab a **rotatable 3D world globe** with country discovery on the sphere:

- Drag to spin the globe; pinch (or double-tap controls) to zoom
- Country pins at `MapCountry.latlng` on the sphere surface
- Tap a pin → same bottom **country preview card** as v1 (stats, AI fact, Save, Explore Country)
- **Selected country** — gold highlight / pulse on the pin (match Peru emphasis from the 2D design, adapted to 3D)
- **Random Country** FAB — camera animates to face a random pin
- Optional: header **globe icon** toggles **2D ↔ 3D** if `react-native-maps` from v1 is kept (recommended for teaching and fallback)

Reuse `useMapStore`, `fetchMapCountries`, `fetchCountryByName`, `openCountryInExplore`, `SearchOverlay`, and `useSavedCountriesStore` — no duplicate state.

## Prerequisites (all required)

- `prompts/12-map-ui.md` **completed** — Map tab ships with header, chips, preview card, FAB, `use-map-store.ts`, `fetchCountryByName`, `react-native-maps` 2D canvas
- `prompts/10c-search-ui.md` — search overlay + `openCountryInExplore`
- `prompts-worldloop/07-map-endpoint.md` — `GET /map/countries` stable
- Backend + Redis running locally for map + country detail calls

## UX mental model

v1 Map = **flat atlas** (pan north/south, markers on a plane).

v2 Map = **planet in your hands** (spin the world, tap a glowing pin, same bottom card answers “what is this country?”).

Users should not lose any v1 actions: search, save, explore, random country, trending badge on select pins.

## Dependencies

### Already in the project (reuse)

- `expo-router`, `expo-image`, `zustand`, `@expo/vector-icons`
- `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`
- `react-native-maps` (from v1 — keep for 2D mode or remove only if you drop the toggle)

### 3D stack (required — ask user first)

**Ask the user for approval** before installing. Prefer the **teachable** stack (Three.js concepts map cleanly to coursework):

```bash
npx expo install expo-gl three expo-three
npx expo install @react-three/fiber @react-three/drei
```

| Package              | Role                                      |
| -------------------- | ----------------------------------------- |
| `expo-gl`            | Native `GLView` / WebGL context           |
| `three`              | 3D math, sphere, materials, camera        |
| `expo-three`         | Bridges `GLView` → `THREE.WebGLRenderer`  |
| `@react-three/fiber` | Declarative React renderer for Three.js   |
| `@react-three/drei`  | Helpers (`OrbitControls`, `Sphere`, etc.) |

**Alternative (only with explicit user approval):** [`@aeryflux/globe`](https://github.com/aeryflux/globe) — prebuilt globe meshes + RN helpers; faster visually, less transparent for teaching. Document why you chose it if used.

Do **not** add Mapbox GL, Cesium, Unity, or native AR modules without approval.

### Platform notes

- Test on a **physical device** when possible — iOS Simulator / Android emulator WebGL can be flaky with Three.js + EXGL
- **Web** is optional for this prompt; if the globe does not run on web, show a friendly fallback message on web only (do not block native)
- Use **development builds** if Expo Go limits GL features in your SDK version

## Route & files

| Path                                   | Purpose                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `components/map/globe-view.tsx`        | 3D globe canvas (`Canvas` + sphere + pins); owns GL lifecycle                  |
| `components/map/globe-country-pin.tsx` | Single country marker (mesh/sprite + press target)                             |
| `components/map/map-canvas.tsx`        | Thin wrapper: renders `GlobeView` or v1 `MapView` based on `mapMode`           |
| `lib/latlng-to-sphere.ts`              | `latLngToVector3(lat, lng, radius)` + inverse helpers (unit tests optional)    |
| `store/use-map-store.ts`               | Extend with `mapMode: "2d" \| "3d"`, `setMapMode`, `focusCountryOnGlobe(name)` |
| `app/(tabs)/map.tsx`                   | Swap 2D map section for `MapCanvas`; wire globe icon → toggle mode             |

Keep existing v1 components (`MapHeader`, `MapFilterChips`, `MapCountryPreviewCard`, `RandomCountryFab`, etc.) — only replace the map **viewport**.

## Coordinate math

Backend sends WGS84-style `[lat, lng]` on `MapCountry.latlng`.

Convert to a point on a unit sphere (radius `R`, e.g. `1`):

```ts
// lib/latlng-to-sphere.ts — illustrative; implement and export
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}
```

- Place each pin slightly **above** the surface (`radius * 1.02`) so markers don’t z-fight with the globe mesh
- `focusCountryOnGlobe` — animate camera / controls target so the selected pin faces the user (use `OrbitControls` `target` + optional `camera.lookAt`)

## Data wiring (unchanged from v1)

### Map list

- `loadMapCountries()` → `fetchMapCountries()` → `countries: MapCountry[]`
- Skip entries with invalid `latlng`

### Selection + detail

- `selectCountry(name)` — sets `selectedCountry`, triggers `fetchCountryByName` for preview card AI block (same as v1)
- Preview card UI — **copy from v1**; do not redesign unless fixing a bug

### Integrations

| Action          | Implementation                                      |
| --------------- | --------------------------------------------------- |
| Save            | `useSavedCountriesStore.toggleSaved`                |
| Explore Country | `openCountryInExplore(detailOrMinimalCountry)`      |
| Search bar      | `useSearchUiStore` + `SearchOverlay`                |
| Random Country  | `selectRandomCountry()` + `focusCountryOnGlobe`     |
| Trending badge  | `constants/trending-countries.ts` (same list as v1) |

No new backend routes for v2.

## 3D globe implementation

### Globe mesh

- Base: `Sphere` (or `mesh` + `SphereGeometry`) with **dark** material — deep gray `#1a1a2e` / near-black, subtle emissive gold rim optional
- Optional: very low-poly wireframe overlay for “tech” look (keep performant)
- **Do not** ship 20MB GLB country meshes in v2 — use simple pins on a smooth sphere (teachable + fast)

### Country pins

- One pin per `MapCountry` (or capped subset — see performance)
- Default: small gold sphere or billboard sprite
- **Selected:** scale up + brighter emissive gold + optional ring
- **Trending:** small flame badge as 2D overlay in preview card only, or a second material on pin — avoid DOM inside `Canvas`

### Interaction

- `OrbitControls` from `@react-three/drei` — rotate globe, damped inertia
- Pin `onPress` → `selectCountry(name)` (use R3F pointer events / `Pressable` wrapper pattern supported on native)
- Tap empty space → optional `selectCountry(null)` to dismiss card

### 2D ↔ 3D toggle (recommended)

- `useMapStore.mapMode`: `"2d" | "3d"` (default `"3d"` after v2 ships, or `"2d"` until user flips — document choice)
- Header left **globe icon** toggles mode
- `components/map/map-canvas.tsx` renders:
  - `"2d"` → existing `react-native-maps` `MapView` from v1
  - `"3d"` → `GlobeView`
- Persist `mapMode` in AsyncStorage (optional stretch)

### Map controls (adapt v1 overlays)

| Control         | 3D behavior                                           |
| --------------- | ----------------------------------------------------- |
| Zoom +/-        | Adjust `OrbitControls` min/max distance or camera FOV |
| Compass / reset | Reset camera to default world-facing pose             |
| Legend          | Same stub as v1 (“Gold pins = countries”)             |

Position controls over the `GLView` with absolute layout (NativeWind on wrapper `View`, not on `GLView`).

## Performance guidelines

Rendering ~195 pins is acceptable as **simple meshes**; avoid 195 text labels in 3D.

- Prefer **instanced** or shared geometry for pins
- Debounce globe rotation callbacks
- Do not load full `Country` objects for every pin — only for `selectedCountry`
- If frame rate drops on low-end devices: show pins for trending + region filter only, or reduce pin count with a “Show all” chip (document in PR)

## UI chrome (reuse v1 — do not redesign)

Match `map-screen-ui.png` for everything **except** the map viewport:

- Header, title, subtitle, search, filter chips, preview card, FAB, tab bar spacing
- 8pt grid, gold `#fbbf24` accents, dark backgrounds
- `constants/images.ts` for logo and avatar

## Styling rules

- **NativeWind** on layout wrappers around the globe
- **StyleSheet / inline** for `GLView`, R3F `Canvas`, and anything in `AGENTS.md` map exceptions
- No `className` on `SafeAreaView`

## Out of scope

- Country border polygons / choropleth extrusion on the globe
- Real-time trending from backend
- Server-side clustering (still N/A)
- AR / camera passthrough globe
- Music-reactive or weather globe shaders
- Replacing Explore feed or Home dashboard
- New `GET` endpoints or map-specific filters on the API
- Shipping large CDN GLB assets (>2MB) without user approval
- Removing v1 2D map entirely unless product explicitly wants 3D-only (prefer toggle)

## Acceptance criteria

- Map tab renders an interactive **3D globe** in `"3d"` mode (spin + zoom)
- Pins align with correct lat/lng (spot-check: Japan, Brazil, Iceland)
- Tapping a pin opens the **same** preview card as v1 with correct stats
- AI fun fact still loads via `GET /country/:name` after selection
- Save, Explore Country, Search overlay, and Random Country FAB behave like v1
- Selected pin has visible gold emphasis
- 2D ↔ 3D toggle works if implemented (both modes usable)
- Loading / error states for map countries do not crash the GL view
- `npm run lint` passes
- New 3D dependencies only added after user approval
- Tested on at least one physical device OR documented simulator limitation

## Testing

```bash
# Terminal 1 — backend + Redis
# Terminal 2
npx expo start
```

1. Open **Map** tab — globe visible in 3D mode; countries loaded
2. Spin globe — smooth rotation; release — inertia stops
3. Pinch / zoom controls — camera distance changes
4. Tap **Japan** (or known coords) — preview card + AI fact; pin highlighted
5. Tap **Explore Country** — Explore opens on that country
6. Tap **Random Country** — new selection + camera faces pin
7. Toggle **2D** (if built) — flat map works; toggle back to 3D
8. Open search → pick country → Explore (unchanged)
9. Stop backend — map error UI; GL does not white-screen

## Teaching notes (for students)

Document in code comments or README snippet:

1. Why `latlng` becomes a 3D vector (spherical coordinates)
2. What `expo-gl` provides vs DOM WebGL
3. How R3F’s `Canvas` maps to React Native
4. Tradeoff: 2D maps (`react-native-maps`) vs 3D globe (Three.js)

## Next steps

After this prompt:

1. Persist `mapMode` + last camera pose in AsyncStorage
2. Region chip filters that hide/show pin subsets on the globe
3. Saved countries screen (`prompt_material/saved-screen-ui.png`)
4. Optional: custom globe texture (night lights) with user-approved asset in `assets/`
