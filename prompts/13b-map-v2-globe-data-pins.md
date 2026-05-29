Read AGENTS.md first and follow it strictly.

Parent: [`13-map-v2-3d-globe.md`](./13-map-v2-3d-globe.md) · Previous: [`13a-map-v2-globe-debug.md`](./13a-map-v2-globe-debug.md) · Next: [`13c-map-v2-globe-ux.md`](./13c-map-v2-globe-ux.md)

## Step 2 — Real data pins

**Goal:** Replace fake pins with **backend countries** at correct `latlng` positions. Globe behavior from Step 1 must stay stable.

Build:

- `lib/latlng-to-sphere.ts` — shared conversion helper
- Wire `fetchMapCountries` / `useMapStore` → one pin per valid `MapCountry`
- Pin tap → `selectCountry(name)` in store (preview card can still be minimal)

Do **not** implement yet: camera fly-to animation, random country FAB behavior, gold selection pulse, 2D ↔ 3D toggle, or map control zoom wiring (Step 3).

## Prerequisites

- [`13a-map-v2-globe-debug.md`](./13a-map-v2-globe-debug.md) **completed** — debug globe spins and zooms on device
- `prompts-worldloop/07-map-endpoint.md` — `GET /map/countries` stable
- Backend + Redis running locally

## Files to create / touch

| Path                                   | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| `lib/latlng-to-sphere.ts`              | `latLngToVector3(lat, lng, radius)` + exports     |
| `components/map/globe-view.tsx`        | Remove debug pins; map `countries` → pins         |
| `components/map/globe-country-pin.tsx` | Accept `MapCountry` or `{ name, lat, lng }`       |
| `store/use-map-store.ts`               | Ensure `countries`, `loadMapCountries`, `selectCountry` used |
| `app/(tabs)/map.tsx`                   | Call `loadMapCountries()` on mount; pass countries to globe |

Remove `DEBUG_PINS` constant from Step 1.

## Coordinate math

Backend sends WGS84-style `[lat, lng]` on `MapCountry.latlng`.

```ts
// lib/latlng-to-sphere.ts
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

- Place pins at `radius * 1.02`
- Skip countries with missing or invalid `latlng`

## Data wiring

### Map list

- `loadMapCountries()` → `fetchMapCountries()` → `countries: MapCountry[]`
- Globe renders pins from store; show loading overlay **outside** `Canvas` (do not unmount GL on fetch)

### Selection (minimal)

- Pin `onPress` → `selectCountry(name)` — sets `selectedCountry` in store
- Preview card may appear with v1 layout but **Step 3** owns full detail fetch, highlight, and FAB — for Step 2, verifying store updates is enough

### Do not duplicate state

Reuse existing `useMapStore` fields from v1. No second countries array.

## Country pins

- One pin per valid `MapCountry` (~195 simple meshes is OK)
- Default: small gold sphere or shared geometry
- **No** selection scale/emissive yet (Step 3)
- **No** trending badge on pin mesh yet (Step 3 / card only)

Prefer shared geometry / instancing if you already know how; otherwise simple mapped meshes are fine for teaching.

## Performance guidelines

- Do not load full `Country` objects for every pin — list items only
- Do not render country name labels in 3D
- If frame rate drops: cap pins or filter by region (document in PR); do not block Step 2 on this unless device is unusable

## Acceptance criteria

- [ ] Debug fake pins **removed**; pins come from `GET /map/countries`
- [ ] `latLngToVector3` lives in `lib/latlng-to-sphere.ts` and is used by globe
- [ ] Spot-check alignment: **Japan**, **Brazil**, **Iceland** look correct on sphere
- [ ] Invalid `latlng` entries skipped without crash
- [ ] Tap pin → `selectedCountry` updates in store
- [ ] Loading / error states for map countries do not crash or white-screen the GL view
- [ ] Step 1 orbit controls still work (spin + zoom)
- [ ] `npm run lint` passes

## Testing

```bash
# Terminal 1 — backend + Redis
# Terminal 2
npx expo start
```

1. Open **Map** — globe + pins after countries load
2. Spin globe — all pins move with sphere; no z-fighting flicker
3. Tap **Japan** — store shows selected name (card may be partial)
4. Stop backend — error UI outside GL; globe does not white-screen
5. Restart backend — retry loads pins again

## Do not start Step 3 until

All countries render and pin taps reliably update selection without GL crashes.
