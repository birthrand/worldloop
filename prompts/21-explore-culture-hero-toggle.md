Read `AGENTS.md` first and follow it strictly.

Reference: `prompts/10f-explore-swipe-deck-prefetch.md`, `prompts/17-culture-video-feed.md`, `components/explore/explore-swipe-card.tsx`, `components/culture/culture-video-slide.tsx`, `lib/format-country.ts`, `constants/explore-swipe-layout.ts`

Implement an **in-card Culture toggle** on the Explore swipe card: a culture icon that switches the **hero region** between the existing horizontal **image** carousel and a **looping culture video** — without leaving Explore or changing the card footer layout.

---

## Goal

Users stay on the Explore swipe deck and tap a culture icon to preview a country's travel clip inline.

| State     | Hero media                              | Footer (unchanged)            |
| --------- | --------------------------------------- | ----------------------------- |
| **Image** | `HeroImagePager` + `MediaCarousel` dots | Title, bookmark, AI fact      |
| **Video** | `CultureVideoSlide` (full-bleed, muted) | Same title, bookmark, AI fact |

**Product split (keep both surfaces):**

| Surface                         | Behavior                                         |
| ------------------------------- | ------------------------------------------------ |
| **Explore card (this feature)** | Toggle image ↔ video in the hero only            |
| **Culture tab**                 | Full-screen vertical video feed (`prompts/17-*`) |

The existing `ExploreActionRail` Culture button that calls `openCountryInCulture()` can remain for navigation to the Culture tab, or be updated later — this prompt focuses on the **in-place hero toggle**.

---

## Architecture decision: swap hero only

**Do not** replace the whole card or navigate away on toggle.

`ExploreSwipeCard` is already split into two stable layers:

```text
ExploreSwipeCard
├── imageRegion (flex: 1)     ← swap content here only
│   ├── image mode → HeroImagePager + MediaCarousel
│   └── video mode → CultureVideoSlide
└── infoRegion (fixed height) ← never changes height
    └── title, bookmark, "Did you know" fact
```

`EXPLORE_SWIPE_CARD_INFO_REGION_HEIGHT` in `constants/explore-swipe-layout.ts` is fixed so the hero never jumps when fact text varies. Keep that contract.

---

## Prerequisites

- `prompts/10f-explore-swipe-deck-prefetch.md` — swipe deck, `ExploreSwipeCard`, `heroIndex` control
- `prompts/17-culture-video-feed.md` — `CultureVideoSlide`, `expo-video`, mute store
- `prompts-worldloop/15-video-service.md` — `videos[]` on enriched countries
- `hasCultureVideo`, `getCultureVideo`, `getCulturePosterUri` in `lib/format-country.ts`

---

## Data & helpers (already exist)

### `types/country.ts`

```ts
export type CountryVideo = {
  url: string;
  poster?: string;
  provider?: string;
  duration?: number;
};

export type Country = {
  // ...
  images?: string[];
  videos?: CountryVideo[];
};
```

### `lib/format-country.ts`

| Helper                  | Use on Explore card                      |
| ----------------------- | ---------------------------------------- |
| `hasCultureVideo()`     | Enable / disable culture icon            |
| `getCultureVideo()`     | Pass to `CultureVideoSlide`              |
| `getCulturePosterUri()` | Video poster + world-background fallback |
| `getCountryImages()`    | Image mode (unchanged)                   |
| `getAiFactByIndex()`    | Fact text (see Fact behavior below)      |

---

## State model

Add local state inside `ExploreSwipeCard` (or a thin `HeroMediaRegion` wrapper):

```ts
type HeroMediaMode = "image" | "video";

const [heroMode, setHeroMode] = useState<HeroMediaMode>("image");
```

### Reset rules

| Event                      | Reset                                                      |
| -------------------------- | ---------------------------------------------------------- |
| `country.name` changes     | `heroMode → "image"` (deck already resets `heroIndex → 0`) |
| Swipe to next/prev country | Unmount/remount handles video pause via `isActive`         |

### Toggle handler

```ts
const cultureVideo = getCultureVideo(country);
const canShowVideo = cultureVideo !== null;

const handleToggleCulture = () => {
  if (!canShowVideo || !interactive) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setHeroMode((m) => (m === "image" ? "video" : "image"));
};
```

When entering video mode, optionally force `heroIndex` to `0` so deck swipe-back rules stay consistent.

---

## UI: culture icon placement

**Recommended:** overlay on `imageRegion` (bottom-right), TikTok-style.

- Does not alter the fixed `infoRegion` height
- Visible in both image and video modes (icon reflects active state)
- Use `GlassIconButton` with `variant="compact"` or a small frosted pill
- Icon: `film-outline` (matches `ExploreActionRail`)
- Active state when `heroMode === "video"` (accent color or filled variant)
- `disabled={!hasCultureVideo(country)}` with reduced opacity
- `pointerEvents="box-none"` on overlay container so hero taps still work in image mode

**Avoid** adding a footer action row unless `EXPLORE_SWIPE_CARD_INFO_REGION_HEIGHT` is recalculated — that would shift hero height for every card.

---

## Hero region implementation

### Image mode (`heroMode === "image"`)

Keep current behavior:

- `HeroImagePager` with `heroIndex`, `onHeroIndexChange`, `heroScrollEnabled`
- `MediaCarousel` segment overlay when `images.length > 1`
- `onImagePress` → `openCountryDetail`

### Video mode (`heroMode === "video"`)

Render `CultureVideoSlide`:

```tsx
<CultureVideoSlide
  video={cultureVideo}
  flag={country.flag}
  iso2={country.cca2}
  posterUri={getCulturePosterUri(country)}
  isActive={interactive}
  width={heroSize.width}
  height={heroSize.height}
/>
```

Hide in video mode:

- `MediaCarousel` segment dots
- Horizontal hero paging (`heroScrollEnabled` irrelevant)

Reuse `useCultureFeedStore.isMuted` for mute consistency with the Culture tab.

### Optional extraction

If `explore-swipe-card.tsx` grows too large, extract:

```text
components/explore/hero-media-region.tsx
├── props: country, heroSize, heroMode, heroIndex, interactive, ...
├── image branch
├── video branch
└── CultureToggleButton overlay
```

---

## Gesture & deck integration

`ExploreSwipeDeck` controls vertical dismiss and `heroIndex`:

```ts
const canSwipeBack = canGoBack && heroIndex === 0;
```

**Video mode rules:**

- Treat video mode as “slide 0” — vertical swipe-back and swipe-next must still work
- Do not mount horizontal paging in video mode
- Pass `interactive={false}` on stack cards below — video must not autoplay on the next card preview

No deck changes are strictly required if video mode does not advance `heroIndex`.

---

## Fact text behavior

Today the fact follows `heroIndex`:

```ts
const fact = getAiFactByIndex(country, heroIndex);
```

In video mode, pin to index `0` so the fact does not change mid-clip:

```ts
const fact = getAiFactByIndex(country, heroMode === "video" ? 0 : heroIndex);
```

---

## World background glow

`ExploreSwipeWorldBackground` in `app/(tabs)/explore.tsx` uses the active country's hero image.

When the top card is in video mode, prefer `getCulturePosterUri(activeCountry)` (or first image fallback) so the ambient wash does not go blank.

Options:

1. Lift `heroMode` to deck/feed store (heavier)
2. Pass a `heroMediaMode` callback from card → deck → explore screen (lighter)
3. Always use `getCulturePosterUri` when `hasCultureVideo` and user last toggled video (simplest if mode is deck-local)

Pick (2) or store on `useCountryFeedStore` only if the glow must react live to toggle.

---

## Performance

| Rule                                                       | Reason                             |
| ---------------------------------------------------------- | ---------------------------------- |
| Only mount `CultureVideoSlide` when `heroMode === "video"` | Avoid N video players in the stack |
| `isActive={interactive}` on video                          | Top card only plays                |
| Poster prefetch on card mount when `hasCultureVideo`       | Faster first toggle                |
| Do not mount video on `interactive={false}` stack cards    | Next-card preview stays image-only |

---

## Accessibility

| Control                     | Label                                    |
| --------------------------- | ---------------------------------------- |
| Culture toggle (image mode) | `Watch culture video for {country.name}` |
| Culture toggle (video mode) | `Show photos for {country.name}`         |
| Disabled                    | `No culture video for {country.name}`    |

Hints: describe in-place toggle, not tab navigation.

---

## Files to touch

| File                                                    | Change                                                |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `components/explore/explore-swipe-card.tsx`             | `heroMode` state, hero branch, culture overlay button |
| `components/explore/hero-media-region.tsx`              | _(optional)_ extract hero swap logic                  |
| `components/explore/explore-swipe-world-background.tsx` | _(optional)_ poster URI when video mode active        |
| `components/explore/explore-swipe-deck.tsx`             | _(optional)_ bubble `heroMode` for glow               |
| `constants/explore-swipe-layout.ts`                     | _(optional)_ culture overlay position tokens          |

**Do not change:**

- `EXPLORE_SWIPE_CARD_INFO_REGION_HEIGHT` unless deliberately redesigning the footer
- Culture tab feed (`app/(tabs)/culture`) — separate product surface

---

## Test plan

1. Country **with** video: tap culture icon → hero shows looping video; tap again → back to images.
2. Country **without** video: culture icon disabled / hidden; image carousel unchanged.
3. Forward swipe: video pauses; next card starts in image mode.
4. Back swipe: previous card resets to image mode.
5. `heroIndex > 0` on multi-image country → toggle to video → vertical swipe-back still works (or heroIndex resets to 0).
6. Mute toggle on Culture tab affects in-card video mute (shared store).
7. `npm run lint` and `npm run typecheck` pass.

---

## Out of scope (for later)

- Replacing `openCountryInCulture` in `ExploreActionRail` with the same toggle
- Multiple videos per country in Explore (use first via `getCultureVideo`)
- Native video controls on the card (Culture tab pattern: `nativeControls={false}`)
- Places mode (`ExploreSwipePlaceCard`) — countries only for v1
