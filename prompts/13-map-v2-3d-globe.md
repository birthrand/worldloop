Read AGENTS.md first and follow it strictly.

Reference: `prompt_material/map-screen-ui.png`, `prompts/12-map-ui.md`, `AGENTS.md` (Map Screen Rules), `prompts-worldloop/07-map-endpoint.md`

Implement **Map v2**: replace the **2D map canvas** from `prompts/12-map-ui.md` with an **interactive 3D globe** while keeping the same header, search, filter chips, country preview card, FAB, and data wiring. Visual language stays **dark + gold** (WorldLoop brand).

This is an **upgrade prompt**, not a greenfield Map screen. Do not rebuild Explore, Home, or backend endpoints.

## Build order (important)

Do **not** jump to the full globe system in one pass. Implement in order — each step must work before the next:

| Step | Prompt | What you build |
| ---- | ------ | -------------- |
| **1** | [`13a-map-v2-globe-debug.md`](./13a-map-v2-globe-debug.md) | Debug globe: sphere, lights, orbit controls, 3–5 fake pins |
| **2** | [`13b-map-v2-globe-data-pins.md`](./13b-map-v2-globe-data-pins.md) | Real data: `latlng` → sphere, backend countries, all pins |
| **3** | [`13c-map-v2-globe-ux.md`](./13c-map-v2-globe-ux.md) | UX: preview card, selection highlight, random country, camera animation |

If Step 1 does not spin and zoom smoothly on device, fix that before wiring API data or UX.

## End goal (after all 3 steps)

- Drag to spin the globe; pinch (or zoom controls) to zoom
- Country pins at `MapCountry.latlng` on the sphere surface
- Tap a pin → same bottom **country preview card** as v1
- **Selected country** — gold highlight / pulse on the pin
- **Random Country** FAB — camera animates to face a random pin
- Optional: header **globe icon** toggles **2D ↔ 3D** if v1 `react-native-maps` is kept

Reuse `useMapStore`, `fetchMapCountries`, `fetchCountryByName`, `openCountryInExplore`, `SearchOverlay`, and `useSavedCountriesStore` — no duplicate state.

## Prerequisites (all required)

- `prompts/12-map-ui.md` **completed**
- `prompts/10c-search-ui.md`
- `prompts-worldloop/07-map-endpoint.md`
- Backend + Redis running locally for steps 2–3

## UX mental model

v1 Map = **flat atlas** (pan north/south, markers on a plane).

v2 Map = **planet in your hands** (spin the world, tap a glowing pin, same bottom card answers “what is this country?”).

## 3D stack (required — ask user first)

**Ask the user for approval** before installing. Prefer the **teachable** stack:

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

Install during **Step 1** only. Do not add Mapbox GL, Cesium, Unity, or native AR modules without approval.

### Platform notes

- Test on a **physical device** when possible — Simulator / emulator WebGL can be flaky
- **Web** is optional; friendly fallback on web only if GL fails (do not block native)
- Use **development builds** if Expo Go limits GL features in your SDK version

## Files (full map after Step 3)

| Path                                   | Introduced in |
| -------------------------------------- | ------------- |
| `components/map/globe-view.tsx`        | Step 1        |
| `components/map/globe-country-pin.tsx` | Step 1 (fake) → Step 2 (real) |
| `lib/latlng-to-sphere.ts`              | Step 2        |
| `components/map/map-canvas.tsx`        | Step 3 (2D toggle) |
| `store/use-map-store.ts`               | Step 2–3 extensions |
| `app/(tabs)/map.tsx`                   | Step 1 swap viewport → Step 3 full wiring |

Keep existing v1 components (`MapHeader`, `MapFilterChips`, `MapCountryPreviewCard`, `RandomCountryFab`, etc.) — only replace the map **viewport** incrementally.

## Out of scope (all steps)

- Country border polygons / choropleth on the globe
- Real-time trending from backend
- AR / camera passthrough globe
- New `GET` endpoints
- Shipping large CDN GLB assets (>2MB) without user approval

## Final acceptance (after Step 3)

See [`13c-map-v2-globe-ux.md`](./13c-map-v2-globe-ux.md) for the full checklist.

## Teaching notes (for students)

After Step 3, document briefly:

1. Why `latlng` becomes a 3D vector (spherical coordinates)
2. What `expo-gl` provides vs DOM WebGL
3. How R3F’s `Canvas` maps to React Native
4. Tradeoff: 2D maps (`react-native-maps`) vs 3D globe (Three.js)

## Next steps (post v2)

1. Persist `mapMode` + last camera pose in AsyncStorage
2. Region chip filters that hide/show pin subsets on the globe
3. Saved countries screen (`prompt_material/saved-screen-ui.png`)
4. Optional: custom globe texture (night lights) with user-approved asset in `assets/`
