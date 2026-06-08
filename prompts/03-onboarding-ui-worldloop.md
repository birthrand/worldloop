Read AGENTS.md first and follow it strictly.

Reference: `AGENTS.md` (app structure, styling rules), `prompts/01-nativewind.md`, `prompts/02-design-theme.md`, `prompts/09-bottom-tab-nav.md`, `prompts/04-authentication-ui.md`, `prompts/05-clerk.md`

Build a **4-step first-launch onboarding flow** for **WorldLoop** — a globe-based country discovery app. Match the **layout structure** of the attached reference (logo row, accent headline, subheadline, hero illustration area, dot pager, full-width CTA). Adapt copy, colors, and illustration to WorldLoop; do **not** use Foxi, Lingua, or legacy mascot assets.

Use the **Lottie globe animation** from `assets/animation/globe-earth.json` as the hero illustration on every slide (same animation; copy changes per step).

@prompt_material/02-onboarding-screen.png

---

## Goal

Show onboarding **once** on first app open, then land users in the main app (`/(tabs)/explore`). The flow should teach:

1. What WorldLoop is (country discovery)
2. TikTok-style Explore feed (vertical swipe)
3. Interactive world map
4. Save countries + track discovery progress

Primary CTA on the last slide: **Get Started** → complete onboarding → navigate to Explore (or Sign Up when auth from `prompts/04-authentication-ui.md` / `prompts/05-clerk.md` is wired).

---

## Prerequisites

- `prompts/01-nativewind.md` and `prompts/02-design-theme.md` — Poppins fonts, tokens in `global.css` (`midnight-navy`, `ocean-blue`, `teal-cyan`, `aurora-purple`, `background`, `surface`)
- `prompts/09-bottom-tab-nav.md` — `(tabs)` routes exist; default post-onboarding destination is **Explore** (`/(tabs)/explore`), matching current `app/index.tsx` redirect
- `hooks/use-app-fonts.ts` — fonts loaded before onboarding renders

Recommended (not blocking):

- `prompts/10a-explore-ui.md` — Explore feed is the natural landing tab after onboarding
- `prompts/12-map-ui.md` — map slide copy aligns with map onboarding sheet behavior

---

## Dependencies

### Required (ask user before installing)

Lottie is **not** in `package.json` today. Install SDK-compatible packages:

```bash
npx expo install lottie-react-native
```

Do **not** add other UI kits, React Query, or axios.

### Already installed

- `expo-router`, `expo-image`, `expo-linear-gradient`, `expo-haptics`
- `zustand`, `@react-native-async-storage/async-storage`
- `@expo/vector-icons`
- `react-native-safe-area-context`
- `react-native-reanimated` (optional subtle CTA press scale)

---

## Route & files

| Path                            | Purpose                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `app/onboarding.tsx`            | **Primary route** — full-screen onboarding pager; export default as `OnboardingScreen` |
| `app/index.tsx`                 | Gate: redirect to `/onboarding` if not completed, else `/(tabs)/explore`               |
| `app/_layout.tsx`               | Register `<Stack.Screen name="onboarding" />` (no header)                              |
| `components/onboarding/`        | Reusable blocks (extract when it keeps the screen readable)                            |
| `constants/animations.ts`       | Centralized Lottie JSON imports                                                        |
| `store/use-onboarding-store.ts` | `hasCompletedOnboarding` + `completeOnboarding()` persisted to AsyncStorage            |

### Suggested components

| Component         | Responsibility                                                             |
| ----------------- | -------------------------------------------------------------------------- |
| `OnboardingPager` | Horizontal `FlatList` or `ScrollView` paging between 4 slides              |
| `OnboardingSlide` | Logo, headline, subheadline, Lottie hero, optional feature chips           |
| `OnboardingDots`  | 4-dot progress indicator (active = `ocean-blue` or `aurora-purple`)        |
| `OnboardingCta`   | Bottom primary button — **Next** on slides 1–3, **Get Started** on slide 4 |

Keep business logic in the store; the screen orchestrates layout, pager index, and navigation.

---

## Assets

### Lottie (required)

Register in `constants/animations.ts`:

```ts
import globeEarth from "@/assets/animation/globe-earth.json";

export const animations = {
  globeEarth,
};
```

Use via `LottieView`:

```tsx
import LottieView from "lottie-react-native";
import { animations } from "@/constants/animations";

<LottieView
  source={animations.globeEarth}
  autoPlay
  loop
  style={{ width: 280, height: 280 }}
/>;
```

Do **not** `require()` the JSON directly in screen files.

### Static images

Add to `constants/images.ts` if not already present:

- `images.worldloopIcon` — top logo beside **WorldLoop** wordmark

Do **not** use `mascot-logo`, Foxi, or Lingua fox illustrations.

---

## CORE LAYOUT

Match `@prompt_material/02-onboarding-screen.png` structure with WorldLoop branding. Use **8-point spacing** (8, 16, 24, 32).

### Screen shell

| Element     | Spec                                                                                 |
| ----------- | ------------------------------------------------------------------------------------ |
| Background  | Light — `bg-background` (`#f1f5f9`) or white; consistent with Home dashboard         |
| Safe area   | `SafeAreaView` with inline/`StyleSheet` styles only (no `className` on SafeAreaView) |
| Status bar  | `expo-status-bar` — dark content on light background                                 |
| Pager       | Horizontal snap paging; one slide full width; disable vertical bounce                |
| Bottom area | Fixed CTA + dot row above home indicator; `paddingBottom` respects safe area         |

### Top brand row (every slide)

| Element            | Spec                                                                      |
| ------------------ | ------------------------------------------------------------------------- |
| Logo               | `images.worldloopIcon` ~32×32                                             |
| Wordmark           | **WorldLoop** — Poppins SemiBold, `text-midnight-navy`                    |
| Tagline (optional) | `brand__tagline` — **EXPLORE. CONNECT. BELONG.** below or beside wordmark |

### Slide content pattern

| Element         | Spec                                                                                   |
| --------------- | -------------------------------------------------------------------------------------- |
| Headline        | `h1` or `h2` — one accent word in `text-ocean-blue` or `text-aurora-purple`            |
| Subheadline     | `body-md` or `body-lg`, `text-muted`, max ~2 lines, centered                           |
| Hero            | Centered `LottieView` with `animations.globeEarth` — ~260–300px square                 |
| Vertical rhythm | Logo → 24px → headline → 12px → subheadline → 24px → Lottie → flex spacer → dots → CTA |

### Dot indicator

| Element  | Spec                                                 |
| -------- | ---------------------------------------------------- |
| Count    | 4 dots                                               |
| Active   | Filled circle, `ocean-blue` or `aurora-purple`, ~8px |
| Inactive | `border` / `#e2e8f0`, ~8px                           |
| Tap      | Optional — tapping a dot jumps to that slide         |

### CTA button

| Element    | Spec                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------- |
| Slides 1–3 | Label **Next** + chevron (`Ionicons` `chevron-forward`)                                      |
| Slide 4    | Label **Get Started** + chevron                                                              |
| Style      | Full width (horizontal padding 24), height ~52, `rounded-2xl`, white label, Poppins SemiBold |
| Fill       | `bg-ocean-blue` or `bg-gradient-ocean` via `LinearGradient` + `StyleSheet`                   |
| Press      | Light haptic (`expo-haptics`) + subtle scale (optional Reanimated)                           |
| Skip       | Optional text link **Skip** top-right on slides 1–3 → same as completing onboarding          |

---

## SLIDE COPY (WorldLoop)

Use this copy exactly unless design review changes it:

| #   | Headline                                       | Subheadline                                                                                   |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Discover the world, **one country at a time.** | Swipe through immersive stories, photos, and AI-powered facts from every corner of the globe. |
| 2   | Your feed is a **passport** to adventure.      | Swipe up and down to explore countries TikTok-style — one destination fills the screen.       |
| 3   | Tap the **map** to go anywhere.                | Pinch, drag, and tap countries on an interactive globe. Focus a nation, then dive deeper.     |
| 4   | Save places. **Track** your journey.           | Bookmark favorites, build streaks, and watch your world progress grow as you explore.         |

Accent words are the bold-colored segment in each headline (implement with nested `Text` + accent color).

---

## DESIGN SYSTEM

| Token                    | Usage                                                                        |
| ------------------------ | ---------------------------------------------------------------------------- |
| `midnight-navy`          | Headlines, wordmark                                                          |
| `ocean-blue`             | Primary CTA, active dot, accent words (preferred)                            |
| `aurora-purple`          | Alternate accent on slide 1 headline only (optional variety)                 |
| `muted`                  | Subheadlines                                                                 |
| `background` / `surface` | Screen and optional card surfaces                                            |
| Typography               | Poppins via `global.css` utilities (`h1`, `h2`, `body-md`, `brand__tagline`) |

### Styling rules

- Prefer **NativeWind** `className` on `View`, `Text`, `Pressable` where AGENTS.md allows
- Use **StyleSheet** / inline for: `LottieView`, `LinearGradient`, `FlatList`/`ScrollView` paging props, `SafeAreaView`, platform shadows, animated values
- Do **not** put `className` on `SafeAreaView`

---

## IMPLEMENTATION RULES

- Functional components + hooks only
- TypeScript strict — no `any`
- Export screen as default from `app/onboarding.tsx`; main component name **`OnboardingScreen`**
- Never call AI APIs or expose keys from onboarding
- Do **not** duplicate map onboarding — `components/map/map-onboarding-sheet.tsx` is a **separate**, in-map contextual sheet (`hasSeenMapOnboarding` in `use-map-ui-store`)

---

## BEHAVIOR

### Onboarding store (`store/use-onboarding-store.ts`)

```ts
type OnboardingState = {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // __DEV__ only — for testing
};
```

- Persist with Zustand `persist` + AsyncStorage (same pattern as `use-discovery-progress-store.ts`)
- Storage key: `worldloop:onboarding:completed` (or nested under a single app-settings key)
- `completeOnboarding()` sets `hasCompletedOnboarding: true`

### App entry gate (`app/index.tsx`)

Replace the unconditional Explore redirect:

1. Wait for onboarding store hydration (show nothing or splash-style blank — match root layout font gate)
2. If `!hasCompletedOnboarding` → `<Redirect href="/onboarding" />`
3. Else → `<Redirect href="/(tabs)/explore" />`

When Clerk auth ships (`prompts/05-clerk.md`), extend the gate:

- Not authenticated **and** not completed onboarding → `/onboarding`
- Completed onboarding **and** not authenticated → `/(auth)/sign-up` (or sign-in)
- Authenticated → `/(tabs)/explore`

For **this prompt**, completing onboarding navigates directly to Explore unless auth routes already exist.

### Navigation actions

| Control                   | Behavior                                                     |
| ------------------------- | ------------------------------------------------------------ |
| **Next**                  | Advance pager to next slide; animate dot indicator           |
| **Get Started** (slide 4) | `completeOnboarding()` → `router.replace("/(tabs)/explore")` |
| **Skip** (optional)       | `completeOnboarding()` → `router.replace("/(tabs)/explore")` |
| Swipe horizontal          | Move between slides; sync dot index                          |

Use `router.replace` (not `push`) so users cannot back-navigate into onboarding after completing it.

### Lottie performance

- Mount one shared `LottieView` above the pager **or** one instance per slide with `autoPlay` only when slide is active — prefer **single instance** to avoid decoding the large JSON multiple times
- Pause animation when app backgrounds (optional `AppState` listener)

---

## DO NOT

- Do **not** use Foxi / Lingua branding, copy, or mascot assets
- Do **not** require `@prompt_material/onboarding/onboarding-ui-*.png` — those paths are legacy; use `@prompt_material/02-onboarding-screen.png` for layout only
- Do **not** add a dev-only link on Home to reopen onboarding in production builds
- Do **not** rebuild the bottom tab bar on the onboarding screen
- Do **not** `require()` Lottie JSON or image assets in screens — use `constants/animations.ts` and `constants/images.ts`
- Do **not** conflate this flow with `MapOnboardingSheet` (map tab contextual hints)

---

## Out of scope

- Clerk sign-up / sign-in UI (separate prompts — only hook Get Started when routes exist)
- Account creation or email verification modals
- Push notification permission prompts
- Localization / i18n
- Replacing Explore or Map tab onboarding sheets

---

## Acceptance criteria

- [ ] `npx expo install lottie-react-native` completed (with user approval)
- [ ] `constants/animations.ts` exports `globeEarth` from `assets/animation/globe-earth.json`
- [ ] Route `app/onboarding.tsx` renders 4-slide pager with WorldLoop branding
- [ ] Each slide shows `LottieView` using `animations.globeEarth` (autoPlay, loop)
- [ ] Headlines use accent-colored keyword; subheadlines match spec table
- [ ] Dot indicator reflects current slide; **Next** / **Get Started** advance or finish flow
- [ ] `use-onboarding-store` persists completion across app restarts
- [ ] `app/index.tsx` sends first-time users to `/onboarding`, returning users to `/(tabs)/explore`
- [ ] Completing onboarding uses `router.replace` to Explore
- [ ] `npm run lint` passes; run `npm run typecheck` if available

---

## Testing

```bash
# Terminal 1 — backend optional for this UI-only flow
# Terminal 2
npx expo start
```

1. Fresh install / clear AsyncStorage → app opens onboarding (not Explore)
2. Swipe through 4 slides — copy, Lottie, and dots match current index
3. Tap **Next** on slides 1–3 → advances; slide 4 shows **Get Started**
4. Tap **Get Started** → lands on Explore tab; back gesture does not return to onboarding
5. Force-quit and reopen → skips onboarding, goes straight to Explore
6. (**DEV**) Call `resetOnboarding()` → onboarding shows again on next cold start
7. Lottie plays smoothly on iOS and Android; no redbox from missing native module

---

## Next steps

1. Wire **Get Started** → Sign Up when `prompts/04-authentication-ui.md` ships
2. Integrate Clerk gate in `app/index.tsx` per `prompts/05-clerk.md`
3. Optional: different Lottie speeds or subtle parallax on slide change
4. Optional: `expo-splash-screen` hide after onboarding store hydrates
5. Profile settings → "Replay intro" (calls `resetOnboarding` + navigate to `/onboarding`)
