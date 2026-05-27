Read AGENTS.md first and follow it strictly.

Parent: [`13-map-v2-3d-globe.md`](./13-map-v2-3d-globe.md) · Previous: [`12-map-ui.md`](./12-map-ui.md) · Next: [`13b-map-v2-globe-data-pins.md`](./13b-map-v2-globe-data-pins.md)

## Step 1 — Debug Globe Mode

**Goal:** Prove WebGL + R3F works on device before any API or UX complexity.

Build **only**:

- Simple sphere (dark material)
- **Ambient** + **directional** light
- `OrbitControls` (drag to spin, pinch / zoom distance)
- **3–5 fake pins** at hardcoded lat/lng (e.g. Japan, Brazil, Iceland, USA, Nigeria)

Do **not** implement yet: backend fetch, `latlng-to-sphere` lib, preview card wiring, random FAB, 2D toggle, selection highlight, or `fetchCountryByName`.

If this step works, everything else becomes easy.

## Prerequisites

- `prompts/12-map-ui.md` completed — Map tab shell exists (header, chips, card slot, FAB area)
- User approved install of 3D stack (see parent prompt)

## Dependencies

```bash
npx expo install expo-gl three expo-three
npx expo install @react-three/fiber @react-three/drei
```

Do **not** add other 3D libraries in this step.

## Files to create / touch

| Path                                   | Purpose                                              |
| -------------------------------------- | ---------------------------------------------------- |
| `components/map/globe-view.tsx`        | `Canvas`, sphere mesh, lights, `OrbitControls`, pins |
| `components/map/globe-country-pin.tsx` | Minimal pin mesh (gold sphere); `name` prop only     |
| `app/(tabs)/map.tsx`                   | Replace 2D `MapView` **viewport** with `<GlobeView />` |

Keep v1 chrome on screen (header, chips, preview card, FAB) — they can stay **unwired** to the globe for now. Card may show previous v1 selection or empty; that is OK.

Optional: `metro.config.js` / asset loader tweaks if required for GL (follow expo-three docs for your SDK).

## Globe mesh

- `Sphere` (or `mesh` + `SphereGeometry`), radius `1`
- Material: deep gray `#1a1a2e` / near-black; optional subtle emissive gold rim
- No texture required in Step 1 (add in a later stretch)

## Lighting

```tsx
<ambientLight intensity={0.4} />
<directionalLight position={[5, 3, 5]} intensity={1.2} />
```

Tune until sphere and pins are clearly visible on a physical device.

## Orbit controls

- `@react-three/drei` `OrbitControls`
- Enable rotate + zoom; damped inertia (`enableDamping`, `dampingFactor`)
- Sensible `minDistance` / `maxDistance` (e.g. `1.4` – `4`)
- Default camera faces Atlantic-ish so fake pins are visible on first load

## Fake pins (hardcoded)

Define a small constant in `globe-view.tsx` or `data/globe-debug-pins.ts`:

```ts
const DEBUG_PINS = [
  { name: "Japan", lat: 36.2, lng: 138.25 },
  { name: "Brazil", lat: -14.2, lng: -51.9 },
  { name: "Iceland", lat: 64.9, lng: -19.0 },
  { name: "United States", lat: 37.1, lng: -95.7 },
  { name: "Nigeria", lat: 9.08, lng: 8.67 },
];
```

For Step 1, inline the same spherical math inside `globe-view.tsx` (copy from parent prompt’s coordinate section) — **do not** create `lib/latlng-to-sphere.ts` until Step 2.

Place each pin at `radius * 1.02` above the surface to avoid z-fighting.

Pin `onPress` (if wired): `console.log(name)` only — no store updates required.

## Styling rules

- **NativeWind** on layout wrappers around the globe
- **StyleSheet / inline** for `GLView`, R3F `Canvas` (per AGENTS.md exceptions)
- Globe fills the same flex area the 2D map used; do not redesign header or card

## Performance (Step 1)

Five pins is trivial. Confirm smooth rotation before proceeding.

## Acceptance criteria

- [ ] Map tab shows a **3D sphere** instead of (or overlaying) the 2D map viewport
- [ ] **Ambient + directional** lights visible; sphere not flat black
- [ ] **Drag** rotates globe with inertia
- [ ] **Pinch** (or equivalent) changes camera distance
- [ ] **3–5 fake pins** visible on the sphere surface
- [ ] No crash on load; no dependency on backend for globe render
- [ ] Tested on **physical device** OR simulator limitation documented
- [ ] `npm run lint` passes

## Testing

```bash
npx expo start
```

1. Open **Map** tab — dark sphere visible (backend may be off)
2. Drag — globe spins smoothly
3. Pinch — zoom in/out
4. Visually confirm ~5 pins on recognizable regions
5. Optional: tap pin — log in Metro console

## Do not start Step 2 until

Spin + zoom feel stable for 30+ seconds of interaction without GL errors or white screen.
