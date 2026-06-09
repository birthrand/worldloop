Read AGENTS.md first and follow it strictly.

Reference: `AGENTS.md` (Explore Screen Rules, Image Data Rules), `prompts/10a-explore-ui.md`, `prompts/16-ai-content-explorer-ui.md`, `prompts-worldloop/03-image-service.md`, `prompts-worldloop/05-feed-endpoint.md`, `prompts-worldloop/15-video-service.md`, `components/onboarding/onboarding-background-video.tsx`, `.agents/skills/upgrading-expo/references/expo-av-to-video.md`

Upgrade the Explore feed hero from **static image paging** to a **TikTok-style mixed media carousel** that can play **looping muted country videos** alongside existing photography. Keep the current vertical country feed, card layout, action rail, and AI fact wiring — only evolve the hero layer and data model.

---

## Goal

Each country in the vertical Explore feed should feel like a short-form video post when video is available:

- **Vertical swipe** still changes country (`ExploreFeed` + `useCountryFeedStore` unchanged in behavior)
- **Horizontal swipe** on the hero cycles **mixed media slides** (video and/or images)
- Active slide **autoplays** when the country page is visible; pauses when off-screen or when user swipes away
- Videos are **muted by default**, loop, and use `contentFit="cover"` like the onboarding background video
- When no video exists, behavior falls back to today’s image-only hero (no regressions)
- Backend supplies optional `videos[]` per country; mobile never calls Pexels/Unsplash video APIs directly

---

## Prerequisites

- `prompts/10a-explore-ui.md` — Explore tab, `ExploreFeed`, `CountryFeedPage`, `HeroImagePager`, `MediaCarousel`, `ExploreCountryCard`
- `prompts/08-zustand.md` — `useCountryFeedStore`, `lib/api.ts`, `types/country.ts`
- `prompts-worldloop/02-local-redis-setup.md` — Redis running
- `prompts-worldloop/03-image-service.md` — `images[]` already merged into feed countries
- `prompts-worldloop/05-feed-endpoint.md` — `GET /feed/countries` pagination works
- **`prompts-worldloop/15-video-service.md` completed** — feed/profile return `videos[]` with direct MP4 URLs
- `expo-video` already installed (`package.json`); onboarding reference at `components/onboarding/onboarding-background-video.tsx`

---

## Dependencies

Use what is already installed:

- `expo-video` (`useVideoPlayer`, `VideoView`) — **not** `expo-av`
- `expo-image` via existing `CountryImage` helper
- `react-native` `FlatList` for horizontal hero paging (same pattern as `HeroImagePager`)
- Existing feed stores and layout constants in `constants/explore-feed-layout.ts`

Do **not** add `expo-av`, React Query, or new video SDKs without user approval.

---

## Data model

### Extend `types/country.ts`

Add a typed media shape so the hero can distinguish video slides from images:

```ts
export type CountryVideo = {
  /** Direct MP4 (or HLS) URL from backend — never a page link. */
  url: string;
  /** Optional poster for loading / ExploreTopBar backdrop. */
  poster?: string;
  /** Source attribution for debug UI (e.g. "pexels"). */
  provider?: string;
  /** Duration in seconds when known. */
  duration?: number;
};

export type CountryMediaSlide =
  | { kind: "image"; uri: string }
  | { kind: "video"; video: CountryVideo };

export type Country = {
  // ...existing fields
  images?: string[];
  videos?: CountryVideo[];
};
```

### Normalization helper — `lib/format-country.ts`

Add helpers (names are suggestions; keep them teachable):

| Function                         | Behavior                                                            |
| -------------------------------- | ------------------------------------------------------------------- |
| `getCountryVideos(country)`      | Returns normalized `CountryVideo[]` (dedupe by `url`, drop invalid) |
| `getCountryMediaSlides(country)` | Builds ordered slide list for the hero pager                        |

**Recommended slide order (v1):**

1. If `videos[0]` exists → first slide is video (poster = `video.poster ?? images[0] ?? flag`)
2. Append all `images[]` as image slides (skip URL duplicated as poster)
3. If no videos and no images → empty list (existing flag placeholder path in `CountryImage`)

Never expose provider API keys in the app. All URLs come from the feed/profile API.

---

## Backend dependency

Implement **`prompts-worldloop/15-video-service.md` first** (or in parallel). The mobile work assumes feed and profile responses include:

```json
"videos": [
  {
    "url": "https://videos.pexels.com/.../....mp4",
    "poster": "https://images.pexels.com/...",
    "provider": "pexels",
    "duration": 14
  }
]
```

When `videos` is missing or `[]`, the app keeps today’s image-only hero with no behavior change.

---

## Route & files

| Path                                       | Purpose                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `types/country.ts`                         | Add `CountryVideo`, `CountryMediaSlide`, optional `videos[]`                                  |
| `lib/format-country.ts`                    | `getCountryMediaSlides`, `getCountryVideos`, backdrop poster helper                           |
| `components/explore/hero-media-pager.tsx`  | **New** — replaces `HeroImagePager` usage; mixed image + video slides                         |
| `components/explore/hero-video-slide.tsx`  | **New** — single slide: `VideoView` + poster + loading/error fallback                         |
| `components/explore/country-feed-page.tsx` | Wire `HeroMediaPager`, pass `isActive`, use media slides not raw `images`                     |
| `components/explore/explore-feed.tsx`      | Backdrop: use poster URI when active slide is video                                           |
| `components/explore/media-carousel.tsx`    | Rename props mentally to “slides”; dots count = slide count                                   |
| `constants/videos.ts`                      | Optional: `exploreFallback` bundled clip **only** for dev/demo when backend returns no videos |

Keep `HeroImagePager` exported until migration is complete, then delete or re-export from `HeroMediaPager` for a thin diff in git history.

---

## Frontend implementation

### 1. `HeroMediaPager`

Evolve `HeroImagePager` → `HeroMediaPager`:

- Props: `slides: CountryMediaSlide[]`, `activeIndex`, `onIndexChange`, `heroWidth`, `heroHeight`, `isPageActive`, `isMuted`, press handlers for AI explorer
- Horizontal `FlatList` with `pagingEnabled` — same scroll math as today
- **Image slide:** existing `CountryImage` inside `Pressable`
- **Video slide:** render `HeroVideoSlide` (see below)
- When `slides.length <= 1`, hide dot carousel (unchanged rule)

### 2. `HeroVideoSlide`

Follow `OnboardingBackgroundVideo` patterns:

```tsx
const player = useVideoPlayer(video.url, (instance) => {
  instance.loop = true;
  instance.muted = isMuted;
});

useEffect(() => {
  if (isPageActive && isSlideActive) {
    player.play();
    return;
  }
  player.pause();
}, [player, isPageActive, isSlideActive, isMuted]);
```

`HeroVideoSlide` props:

| Prop              | Purpose                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| `video`           | `CountryVideo`                                                                  |
| `flag`, `iso2`    | Fallback placeholder via `CountryImage`                                         |
| `isPageActive`    | From `CountryFeedPage` (`isActive`) — false when user swiped to another country |
| `isSlideActive`   | `activeIndex === slideIndex` — false when user swiped to another hero slide     |
| `isMuted`         | Default `true`; wire to optional mute toggle later                              |
| `width`, `height` | Hero shell dimensions                                                           |

`VideoView` settings:

- `contentFit="cover"`
- `nativeControls={false}`
- `allowsPictureInPicture={false}`
- Show **poster** (`CountryImage`) until `playingChange` or `statusChange` indicates ready; hide poster when playing

On load error → fall back to poster/static image; do not crash the feed page.

### 3. `CountryFeedPage` wiring

Replace:

```ts
const images = useMemo(() => getCountryImages(country), [country.name]);
```

With:

```ts
const slides = useMemo(() => getCountryMediaSlides(country), [country.name]);
const heroSlides = useMemo(
  () => Array.from({ length: slides.length }, (_, index) => `${index}`),
  [slides.length],
);
```

Pass `isActive` into `HeroMediaPager` as `isPageActive`.

Reset `heroIndex` to `0` on `country.name` change (already done).

Prefetch: keep image prefetch; optionally `player.replace` prefetch is **not** needed in v1.

### 4. `ExploreFeed` backdrop

Today `backdropImageUri` uses `getCountryImages`. Update to:

```ts
const backdropUri = getExploreBackdropUri(currentCountry, activeHeroIndex);
```

Logic:

- Image slide → that image URI
- Video slide → `video.poster ?? country.images?.[0]`
- Ensures `ExploreTopBar` frosted blur still has a stable still frame while video plays

Add `getExploreBackdropUri` to `lib/format-country.ts`.

### 5. Playback lifecycle rules (critical)

Only **one** video should decode/play at a time:

| State                                            | Video behavior                    |
| ------------------------------------------------ | --------------------------------- |
| Country page off-screen (vertical feed)          | **Pause** all videos on that page |
| Country page active, slide index ≠ video index   | **Pause** that video              |
| Country page active, video slide visible         | **Play** (muted, loop)            |
| User opens AI explorer (`openCountryAiExplorer`) | **Pause** hero video              |
| App background (`AppState` → `background`)       | **Pause** all players             |

Implement `isPageActive` from existing `isActive` on `CountryFeedPage`. Do not instantiate `useVideoPlayer` for off-screen FlatList rows when avoidable — in v1 it is acceptable to mount players only for the active slide index inside the active page (lazy slide mount) to reduce memory.

Suggested lazy pattern inside `HeroMediaPager`:

```tsx
renderItem={({ item, index }) => {
  if (item.kind === "video") {
    if (!isPageActive || index !== activeIndex) {
      return <PosterOnlySlide ... />;
    }
    return <HeroVideoSlide isSlideActive ... />;
  }
  return <ImageSlide ... />;
}}
```

### 6. Optional UX (v1.1 — not blocking)

- **Mute toggle** on `ExploreActionRail` when active slide is video (reuse Listen slot or add speaker icon)
- Subtle **“Video”** pill on video slides (debug/teaching label)
- Double-tap to unmute (TikTok pattern) — only if product asks

---

## UI breakdown

Match the existing Explore feed chrome — **do not redesign** the card, rail, or header:

| Area                 | Video behavior                                                                        |
| -------------------- | ------------------------------------------------------------------------------------- |
| Hero region          | Full-bleed video with same radius (`EXPLORE_FEED_SURFACE_RADIUS`) and shell as photos |
| Dot carousel         | Same pill track; one dot per **slide** (video counts as one slide)                    |
| `ExploreCountryCard` | Unchanged; `getAiFactByIndex(country, heroIndex)` still tracks slide index            |
| `ExploreTopBar`      | Blurred backdrop uses poster still, not live video texture                            |
| Tab bar              | No overlap changes                                                                    |

Styling:

- Prefer **StyleSheet** for `VideoView`, `FlatList`, and animated poster opacity
- NativeWind only where already used in sibling explore components
- No `className` on `SafeAreaView`

---

## Performance & memory

- `ExploreFeed` already uses `windowSize={3}`, `maxToRenderPerBatch={2}`, `removeClippedSubviews` — keep these
- Pause (don’t destroy) players when pausing — faster resume when user swipes back
- Prefer **one video per country** in backend v1 to limit bandwidth
- Do not preload videos for feed neighbors in v1 (images only, like today)
- Test on a mid-range Android device — video + vertical FlatList is the main risk

---

## Out of scope

- User-uploaded video
- Inline audio / narration playback (Listen button stays placeholder unless `expo-speech` product scope returns)
- HLS adaptive streaming (MP4 only for v1)
- Picture-in-picture
- Replacing the entire feed with video-only countries
- AI-generated video
- Persisting mute preference to AsyncStorage (optional stretch)

---

## Acceptance criteria

- Feed countries with `videos[]` show autoplaying muted loop on the first hero slide when page is active
- Swiping **up/down** pauses previous country’s video and plays the new one when applicable
- Swiping **left/right** pauses previous slide’s video and plays the new slide when it is a video
- Countries without `videos[]` behave exactly like the current image hero
- `ExploreTopBar` backdrop remains a sharp still (poster/image), not black
- No `expo-av` imports; only `expo-video`
- Video load failure shows poster/flag fallback without red screen
- `npm run lint` and `npm run typecheck` pass
- Backend returns `videos: []` gracefully when Pexels key missing (local dev without video still works)

---

## Testing

```bash
# Terminal 1 — backend + Redis
# Terminal 2
npx expo start
```

1. Open **Explore** — first country with video autoplays muted on hero
2. Swipe hero horizontally to an image slide — video pauses
3. Swipe back to video slide — video resumes
4. Swipe **up** to next country — previous video stops, new country behaves correctly
5. Background the app — audio/video stops (muted anyway); foreground resumes active slide
6. Turn off backend video service / empty `videos[]` — image-only hero still works
7. Tap hero → AI explorer opens; hero video paused
8. Android: scroll 10+ countries — no OOM/crash

**Dev without backend videos:** temporarily append a known-good MP4 in `getCountryMediaSlides` behind `__DEV__` or use a bundled asset in `constants/videos.ts` for one demo country only.

---

## Next steps

After this prompt:

1. AI explorer hero parity — reuse `getCountryMediaSlides` in `app/country/[name]/ai-explorer.tsx`
2. Mute toggle + persist preference (optional)
3. Prefetch poster frames for next country in feed (not full video files)
