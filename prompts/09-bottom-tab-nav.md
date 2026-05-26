Read AGENTS.md first and follow it strictly.

Reference: `prompt_material/home-screen-ui.png` (bottom navigation bar), `AGENTS.md` (app structure)

Implement **bottom tab navigation** for WorldLoop using Expo Router. Add the tab shell and placeholder screens only — do **not** build the full Home dashboard UI yet (`prompts/10-home-ui.md`).

## Goal

Give the app a production-shaped navigation skeleton:

- Five tabs matching the WorldLoop design: **Home**, **Explore**, **Map** (center globe), **Saved**, **Profile**
- A **custom tab bar** that matches `home-screen-ui.png` (dark bar, gold active state, elevated center globe)
- Simple placeholder content per tab so later prompts can focus on screen UI without reworking routing

## Prerequisites

- `prompts/01-nativewind.md` and `prompts/02-design-theme.md` completed — `global.css`, fonts, and theme tokens exist
- `prompts/08-zustand.md` completed — `store/use-country-feed-store.ts` and `store/use-saved-countries-store.ts` exist
- Backend optional for this step (tabs are UI-only)

## Dependencies

Use what is already installed:

- `expo-router` (tabs via `expo-router` / `@react-navigation/bottom-tabs`)
- `@expo/vector-icons`
- `react-native-reanimated` (smooth active-state / center-button animation if needed)
- `react-native-safe-area-context`

Do **not** add new navigation libraries unless the user approves.

## Route structure

Use Expo Router route groups per `AGENTS.md`:

```txt
app/
  _layout.tsx                 # Root Stack
  index.tsx                   # Redirect → /(tabs)
  dev.tsx                     # Move Zustand feed dev UI here (see below)
  (tabs)/
    _layout.tsx               # Tabs layout + custom tabBar
    index.tsx                 # Home — placeholder only
    explore.tsx               # Explore — placeholder only
    map.tsx                   # Map — placeholder (center globe tab)
    saved.tsx                 # Saved — placeholder only
    profile.tsx               # Profile — placeholder only
components/
  bottom-tab-bar.tsx          # Custom tab bar (extract when it keeps _layout readable)
```

Tab names and labels (exact copy from design):

| Route file    | Tab label                | Icon (suggested)               |
| ------------- | ------------------------ | ------------------------------ |
| `index.tsx`   | Home                     | house / home                   |
| `explore.tsx` | Explore                  | compass                        |
| `map.tsx`     | _(no label — icon only)_ | globe (center, primary action) |
| `saved.tsx`   | Saved                    | bookmark                       |
| `profile.tsx` | Profile                  | person / account               |

The **center Map tab** is visually distinct: larger circular button, overlaps the top edge of the bar, no text label.

## Custom tab bar (match design)

Replicate the bottom bar from `home-screen-ui.png`:

| Element        | Spec                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Bar background | Dark (near-black / deep charcoal — match screenshot, not the light `bg-background` used elsewhere)                |
| Inactive tab   | Muted gray icon + label below                                                                                     |
| Active tab     | Gold / amber icon + label; subtle glow or highlight behind the active icon                                        |
| Center globe   | Oversized circle, dark fill, white/light globe icon, sits above the bar (negative margin or absolute positioning) |
| Safe area      | Respect bottom inset via `useSafeAreaInsets()`                                                                    |

Implementation notes:

- Use `Tabs` from `expo-router` with `tabBar={(props) => <BottomTabBar {...props} />}` (or equivalent) so the bar is fully custom
- Use `StyleSheet` / inline styles for the tab bar (animated values, shadows, platform-specific elevation) — NativeWind alone is awkward for a sliding active indicator
- Optional: animate active tab indicator or center button press with `react-native-reanimated`
- Haptic feedback on tab press (`expo-haptics`) is a nice touch but optional

If gold tab colors are missing from `global.css`, add minimal `@theme` tokens (e.g. `--color-tab-active`, `--color-tab-bar`) rather than hardcoding many one-off hex values.

## Placeholder screens

Each tab screen should be minimal and teachable:

- Title: tab name (e.g. “Explore”)
- One line: “Coming in a later lesson”
- Light padding; use existing typography utilities (`h2`, `body-md`, etc.)
- **Home** (`(tabs)/index.tsx`): do **not** implement Country of the Day, trending carousel, or progress ring — that is `prompts/10-home-ui.md`

## Migrate dev UI from `app/index.tsx`

`app/index.tsx` currently holds the Zustand feed dev panel from `prompts/08-zustand.md`. For this step:

1. Move that dev panel to `app/dev.tsx` (same behavior: feed status, Load feed / Load more / Toggle saved / Clear saved)
2. Change `app/index.tsx` to redirect to the tab app, e.g. `<Redirect href="/(tabs)" />`
3. Do **not** add a tab for dev — keep it reachable via deep link `/dev` for testing only

## Root layout

Update `app/_layout.tsx` if needed:

- Root remains a `Stack` with `headerShown: false`
- Ensure `(tabs)` group is registered
- Keep existing font loading (`useAppFonts`) — do not remove

## Wiring to stores (minimal)

- **No feed fetching** in tab placeholders except on `app/dev.tsx`
- **Saved** placeholder may show `useSavedCountriesStore` count as dev text only (e.g. “0 countries saved”) — full Saved UI is a later prompt
- Do not duplicate API calls from `lib/api.ts` in tab screens

## Out of scope

- Full Home UI (`prompts/10-home-ui.md`, `home-screen-ui.png` main content)
- TikTok-style Explore feed (`prompt_material/explore-screen-ui.png`)
- Interactive map (`prompt_material/map-screen-ui.png`)
- Saved countries grid (`prompt_material/saved-screen-ui.png`)
- Clerk auth, onboarding, or legacy Foxi tabs (Learn, Practice, Progress)
- Backend search/map endpoints (`prompts-worldloop/06`, `07`)

## Acceptance criteria

- App opens to **Home** tab inside `(tabs)` after launch
- All five tabs navigate correctly; center **Map** tab uses the elevated globe treatment
- Active tab styling matches the design reference (gold active, gray inactive, dark bar)
- `app/dev.tsx` still exercises Zustand feed + saved stores
- `npm run lint` passes
- No new major dependencies without user approval

## Testing

```bash
npx expo start
```

1. Launch app — lands on Home tab with placeholder copy
2. Tap each tab — correct screen title; center globe selects Map
3. Open `/dev` — feed dev panel still works with backend running
4. Toggle saved on dev screen, switch to Saved tab — count updates if you surfaced it

## Next steps

After this prompt:

1. `prompts/10-home-ui.md` — build the real Home dashboard on `(tabs)/index.tsx`
2. Explore vertical feed UI — `prompt_material/explore-screen-ui.png`, using `use-country-feed-store`
3. Map and Saved screens when backend `06` / `07` are ready (or placeholders until then)

@prompt_material/home-screen-ui.png
