Read AGENTS.md first and follow it strictly.

Parent: [`13-map-v2-3d-globe.md`](./13-map-v2-3d-globe.md) · Previous: [`13c-map-v2-globe-ux.md`](./13c-map-v2-globe-ux.md)

Reference: `prompt_material/map-screen-ui.png`, `prompts/12-map-ui.md`, `prompts/13c-map-v2-globe-ux.md`

## Step 4 — Map v3 UI/UX upgrade (focus-first, opt-in preview)

**Goal:** Make **map exploration** the primary experience on the Map tab. Country preview is **opt-in**, not forced. Split Map (spatial discovery) from Explore (content consumption).

This is a **behavior + wiring** prompt, not a visual redesign of the preview card, region chrome, or pin rendering.

## Product stance

| Tab | Primary job |
| --- | ----------- |
| **Explore** | Country content — feed, facts, media, low-friction consumption |
| **Map** | Spatial discovery — continents, geography, wandering the globe |

On Map, the map stays king. Preview feels like **reward**, not **interruption**.

## Prerequisites

- [`13c-map-v2-globe-ux.md`](./13c-map-v2-globe-ux.md) **completed**
- Globe + 2D map both usable (`mapMode`, preview card, FAB, search)
- Backend running for `GET /country/:name`

---

## Problem (current behavior)

After v2 continent-focus and v3 one-tap preview work, the Map tab over-indexes on the preview sheet:

| Issue | Current behavior | Expected |
| ----- | ---------------- | -------- |
| **Forced preview** | Pin tap / FAB / shuffle open preview immediately | Default to **country focus** only; preview is opt-in |
| **Map feels secondary** | Tab bar hides, dim overlay, full sheet on most taps | Map stays interactive until user asks for details |
| **No teachable moment** | Users may not understand focus vs preview | One-time FAB hint teaches “tap again for details” |
| **Explore vs Map blur** | Map behaves like a launcher for Explore content | Map = where; Explore = what |

---

## Target UX model

### Navigation hierarchy

```txt
World  →  Continent  →  Country focus  →  Preview (opt-in)
```

| Level | Map state | Bottom UI |
| ----- | --------- | --------- |
| **World** | No `focusedRegion`, no `activeCountry` | FAB + map controls; featured chips |
| **Continent** | `focusedRegion` set, no `activeCountry` | `MapRegionChrome` (continent label \| World) + filter chips |
| **Country focus** | `activeCountry` set, preview **closed** | Lightweight **country focus pill** (name + “Details →”); map chrome stays visible |
| **Country preview** | `activeCountry` + preview open | `MapCountryPreviewCard` only — tab bar hidden, map dimmed |

### Core rules

1. **First tap on pin/marker → focus only (no preview).**
   - Camera flight + selection + pin highlight.
   - Tab bar, FAB, and map controls **stay visible**.
   - No dim overlay, no preview sheet.

2. **Second tap on the same focused pin → open preview.**
   - User explicitly opts into country details.
   - Same country + preview already open → no-op.

3. **Tap a different pin while focused → focus the new country (no preview).**

4. **Tap empty map / ocean while focused (no preview) → clear focus.**
   - Deselect country; return to continent or world browsing as appropriate.

5. **Random Country FAB → focus only (not preview).**
   - Camera flies to a random country; pin highlights.
   - **First FAB use ever:** show a one-time coach mark (see below).
   - Subsequent FAB taps: focus only, no hint.

6. **Preview is never auto-opened on timeout.**
   - Do not “help” the user by opening preview after N seconds.
   - Respect opt-in philosophy.

7. **Shuffle inside an open preview → stay in preview mode.**
   - User is already in details mode; next country opens preview immediately.

8. **High-intent Explore paths stay in Explore.**
   - Explore tab feed, action rail “open in Explore” → Explore screen.
   - Map entry from search / external deep link → **focus only** unless UI explicitly says “with details”.

9. **While preview is open:**
   - Hide `MapRegionChrome` and country focus pill.
   - Preview card owns dismiss + primary actions (× always visible).
   - Tab bar hidden; map controls / FAB hidden.

10. **Unified dismiss when preview is open:**
    - ×, “Back to Continent” (when applicable), tap empty map → `dismissCountryPreview()`.
    - Clears preview **and** deselects country.
    - Continent browsing context → zoom to continent, keep `focusedRegion`.
    - World browsing context → clear focus, stay at world zoom.

---

## Interaction spec

### Country tap (`focusCountry`)

```txt
onCountryPress(country):
  if same country && preview open → no-op
  if same country && focused (no preview) → openCountryPreview(country)
  else → focusCountryOnMap(country)
```

`focusCountryOnMap` must:

1. Cancel continent intent if pending
2. `syncRegionFocusForCountry(country)`
3. `selectCountryOnMap(country, source)`
4. Animate camera to country (`flyMapToCountry` / `focusCountryOnGlobe`)
5. Do **not** set `previewCountryName`
6. Light haptic

`openCountryPreview` must:

1. `setPreviewCountryName(country.name)` — preview opens
2. Light haptic
3. Optionally re-center camera if already focused (usually no-op)

### Country focus pill (new lightweight chrome)

When `activeCountry` is set and preview is **closed**, show a small anchored pill above map controls:

```txt
🇯🇵 Japan · Details →
```

| Element | Action |
| ------- | ------ |
| Pill tap / “Details →” | `openCountryPreview(activeCountry)` |
| × on pill (optional) | Clear focus (`clearCountryFocus()`) — same as tap ocean |

Keep it minimal — **not** the full preview card. Reuse styling patterns from region chrome / action stack (dark pill, rounded).

If pill feels redundant once users learn two-tap, it can stay as the explicit affordance for accessibility.

### One-time Random FAB coach mark

Show **once**, on the **first ever** Random Country FAB press. Persist `hasSeenRandomCountryHint` in `use-map-ui-store` (same pattern as `hasSeenMapOnboarding`).

**First FAB flow:**

1. Pick random country → `focusCountryOnMap(pick, "fab")`
2. After camera starts / lands, show anchored hint above FAB:

   ```txt
   Tap the country for details
   ```

   Or with country name:

   ```txt
   🇯🇵 Japan · Tap pin for details
   ```

3. Hint auto-dismisses after ~4s (no preview auto-open)
4. Set `hasSeenRandomCountryHint = true`

**Subsequent FAB taps:** focus only, no hint.

Do **not** show this hint on map pin taps, shuffle-in-preview, or search entry.

### Preview card dismiss (×, tap-outside, Back to Continent)

Single handler: `dismissCountryPreview()`

Track whether user entered from continent browsing vs world (`previewDismissToContinent` flag set in `focusCountryOnMap` when `focusedRegion` was already set before sync).

| Context | Actions |
| ------- | ------- |
| Continent browsing (`previewDismissToContinent`) | Clear preview, clear `activeCountry`, zoom to continent, keep `focusedRegion`, show region chrome |
| World browsing | Clear preview, clear `activeCountry`, clear `focusedRegion`, reset to world view |

- × button → `dismissCountryPreview()`
- Tap empty map while preview open → `dismissCountryPreview()`
- “Back to Continent” in card → same as × when continent context

### Preview card actions (unchanged layout from v3)

Keep Shuffle + Explore styling (`actionStack` pill). Add continent back when applicable:

| Segment | When shown | Action |
| ------- | ---------- | ------ |
| **Back** (arrow + region label) | continent context | `dismissCountryPreview()` |
| **Shuffle** | Always (when pool available) | `advanceToCountryPreview(next)` — opens preview for next country |
| **Explore** | Always | `openCountryInExplore` |

Order (left → right): `Back` (if region) \| divider \| `Shuffle` \| divider \| `Explore`

### Region chrome (`MapRegionChrome`)

Visible only when:

```txt
!!focusedRegion && !activeCountry && !isPreviewOpen
```

- **Continent segment** → recenter on focused continent (unchanged)
- **World segment** → `handleBackToWorld` (unchanged)

### Random / featured / external entry

| Entry path | Default behavior |
| ---------- | ---------------- |
| Map pin tap (1st) | `focusCountryOnMap` |
| Map pin tap (2nd, same) | `openCountryPreview` |
| Random FAB | `focusCountryOnMap` (+ one-time hint) |
| For You / New Activity chips | `focusCountryOnMap` |
| Search → open on map | `focusCountryOnMap` |
| Explore action rail → Map | `focusCountryOnMap` |
| Shuffle **in preview** | `advanceToCountryPreview` (preview stays open) |

Remove or bypass `spotlightActive` as a separate UI mode. Pin pulse during camera flight is fine.

### Onboarding copy update

Update `MapOnboardingSheet` subtitle from:

```txt
Tap a country to see content from that region.
```

To:

```txt
Tap a country to focus · Tap again for details
```

Optionally add a hint row: dice icon + “Random country”.

### Layout / spacing

**Country focus (no preview):**

```txt
countryFocusPillBottom = mapOverlayBottom   // above controls + FAB
tabBar = visible
mapControls / FAB = visible
```

**Preview open:**

```txt
previewBottomOffset = 0
previewSheetBottomInset = Math.max(insets.bottom, 16)
tabBar = hidden
mapControls / FAB = hidden
```

No stacked external chrome while preview is open. Do not revive floating `MapCountryChrome` for preview dismiss — back navigation lives in the preview card.

---

## State summary

| Variable | World | Continent | Country focus | Preview open |
| -------- | ----- | --------- | ------------- | ------------ |
| `focusedRegion` | `null` | set | set | set |
| `activeCountry` | `null` | `null` | set | set |
| `previewCountryName` | `null` | `null` | `null` | matches active country |
| `spotlightActive` | `false` | `false` | `false` | `false` |
| `MapRegionChrome` | hidden | visible | hidden | hidden |
| Country focus pill | hidden | hidden | visible | hidden |
| Tab bar | visible | visible | visible | hidden |
| Map controls / FAB | visible | visible | visible | hidden |

---

## Files to create / touch

| Path | Purpose |
| ---- | ------- |
| `app/(tabs)/map.tsx` | Split `focusCountryOnMap` vs `openCountryPreview`; focus-first tap/FAB; unified dismiss; country focus pill |
| `components/map/map-country-focus-pill.tsx` | **New** — lightweight “Details →” chrome while focused |
| `components/map/map-random-country-hint.tsx` | **New** — one-time FAB coach mark (or inline in map.tsx if tiny) |
| `components/map/map-country-preview-card.tsx` | × always; Back to Continent in action row (keep v3 layout) |
| `components/map/map-onboarding-sheet.tsx` | Updated copy for focus-first model |
| `lib/open-country-on-map.ts` | External entry → focus only (not preview) |
| `store/use-map-ui-store.ts` | Add `hasSeenRandomCountryHint` + persist |
| `store/use-experience-store.ts` | Stop using `spotlightActive` as UI gate |

Do **not** redesign:

- `MapRegionChrome` visuals
- Preview card typography, colors, stat layout
- Globe pin rendering, marker reveal, continent boundaries

---

## Helpers to extract (recommended)

In `app/(tabs)/map.tsx`:

```ts
focusCountryOnMap(pick: MapCountry, source: SelectionSource, options?: { animate?: boolean })
openCountryPreview(pick: MapCountry)
clearCountryFocus()
dismissCountryPreview()
advanceToCountryPreview(pick: MapCountry)  // shuffle while preview open
```

Both 2D and 3D paths must call these — avoid duplicating focus + preview logic across FAB, tap, shuffle, and external entry.

---

## Out of scope

- Redesigning preview card visuals or adding Save button if not already wired
- Swipe-down to dismiss preview (optional stretch)
- Auto-opening preview after hint timeout
- New backend endpoints
- Region chip filter logic changes
- Persisting camera pose / map mode

---

## Acceptance criteria

- [ ] **First tap** on pin/marker focuses country (camera + highlight) — **no preview**
- [ ] **Second tap** on same focused pin opens preview with correct stats
- [ ] AI fun fact loads via `GET /country/:name` after preview opens
- [ ] Tab bar and map controls **stay visible** during country focus (no preview)
- [ ] Country focus pill shows name + “Details →” while focused
- [ ] Random FAB focuses country — does **not** open preview
- [ ] First-ever FAB shows one-time hint; subsequent FAB taps do not
- [ ] Hint auto-dismisses; preview does **not** auto-open on timeout
- [ ] Shuffle **inside preview** advances to next country with preview open
- [ ] Preview card shows **×** in all preview entry paths
- [ ] “Back to Continent” inside preview card when continent context
- [ ] Dismiss (×, Back to Continent, tap empty map) clears preview **and** deselects country
- [ ] Tap ocean while focused (no preview) clears focus only
- [ ] Search / external map entry focuses country — does not force preview
- [ ] 2D and 3D modes behave the same for focus / preview / dismiss
- [ ] Onboarding copy reflects focus-first model
- [ ] `npm run lint` passes
- [ ] Tested on device: no clipped chrome on iPhone SE / small Android

---

## Testing

```bash
# Terminal 1 — backend + Redis
# Terminal 2
npx expo start
```

### Map tap flow (focus-first)

1. Open **Map** → tap continent cluster → continent zoom + region chrome
2. Tap **Japan** → camera flies, pin highlights, **no preview**; tab bar still visible
3. Tap **Japan** again → preview opens
4. Tap **Explore** → Explore opens on that country
5. Return to Map → tap pin once → focus only
6. Tap pin again → preview open
7. Tap **×** → preview closes, country deselected, region chrome returns
8. Tap **Back to Continent** in card → same result as ×

### World flow

1. Reset to world view (region chrome → World)
2. Tap a country from world zoom → focus only (no preview)
3. Tap same country again → preview opens
4. Dismiss → world view, no selection, no region chrome

### FAB / coach mark

1. Fresh install / reset `hasSeenRandomCountryHint`
2. Tap **Random Country** FAB → flies to country, **no preview**
3. One-time hint appears → auto-dismisses after ~4s
4. Tap FAB again → focus only, **no hint**
5. Tap focused pin → preview opens

### Shuffle in preview

1. Open preview on any country
2. Tap **Shuffle** → new country + preview stays open
3. Dismiss → correct zoom tier for continent vs world context

### 2D ↔ 3D

1. Repeat focus + preview + dismiss in **3D** mode
2. Toggle **2D** → repeat; behavior must match

### Regression

1. Search overlay → pick country → focuses on map (no forced preview)
2. Filter chips on continent → still filter markers
3. Tap empty ocean while focused → clears focus
4. Tap empty ocean while preview open → dismisses preview + selection
5. Map remains usable (pan/zoom) while country is focused

---

## Next steps (post v3)

- Swipe-down to dismiss preview (optional)
- Persist `mapMode` + last camera pose
- Saved countries screen
- Optional globe texture asset
- A/B: pill vs two-tap-only once analytics exist
