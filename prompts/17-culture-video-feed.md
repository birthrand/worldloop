Read AGENTS.md first and follow it strictly.

Reference: `AGENTS.md` (Explore Screen Rules, Image Data Rules), `prompts/09-bottom-tab-nav.md`, `prompts/10a-explore-ui.md`, `prompts-worldloop/03-image-service.md`, `prompts-worldloop/05-feed-endpoint.md`, `prompts-worldloop/15-video-service.md`, `components/culture/culture-video-slide.tsx`, `components/onboarding/onboarding-background-video.tsx`

Implement the **Culture tab** — a TikTok-style **full-screen vertical video feed** for travel and culture clips per country. This is the mobile playback surface for `videos[]` from the backend video service.

**Product split (do not merge):**

| Tab         | Hero media                         | Purpose                                 |
| ----------- | ---------------------------------- | --------------------------------------- |
| **Explore** | Horizontal **image** carousel      | Country discovery with stats + AI facts |
| **Culture** | Full-bleed **looping video** (0–1) | Short-form travel clips, TikTok-style   |

Explore keeps `HeroImagePager` and `getCountryImages()`. Video playback lives on Culture only.

---

## Goal

Each country in the vertical Culture feed should feel like a short-form video post:

- **Vertical swipe** changes country (`CultureFeed` + `useCultureFeedStore`)
- **One video per page** — full-bleed, muted by default, looping, `contentFit="cover"`
- Active page **autoplays** when the Culture tab is focused and the page is visible; pauses when off-screen or tab unfocused
- Countries **without** a valid video are excluded from the feed (poster-only fallback only when a video object exists but fails to load)
- Backend supplies `videos[]` via `GET /feed/culture/countries`; mobile never calls Pexels or other video APIs directly

---

## Prerequisites

- `prompts/09-bottom-tab-nav.md` — `(tabs)/culture` route and custom tab bar
- `prompts/10a-explore-ui.md` — shared patterns: `CountryImage`, `ExploreActionRail`, feed pagination
- `prompts/08-zustand.md` — `lib/api.ts`, `types/country.ts`
- `prompts-worldloop/02-local-redis-setup.md` — Redis running
- `prompts-worldloop/03-image-service.md` — `images[]` for poster fallback
- **`prompts-worldloop/15-video-service.md` completed** — `video.service.ts`, `videos[]` on enriched countries
- **Culture feed endpoint** — `GET /feed/culture/countries` (see Backend section below)
- `expo-video` installed (`package.json`); reference `components/onboarding/onboarding-background-video.tsx`

---

## Dependencies

Use what is already installed:

- `expo-video` (`useVideoPlayer`, `VideoView`) — **not** `expo-av`
- `expo-image` via existing `CountryImage` helper
- `react-native` `FlatList` for vertical paging (same pattern as `ExploreFeed`)
- `useIsFocused` from `@react-navigation/native` — pause video when Culture tab loses focus
- Existing layout constants in `constants/culture-chrome.ts`

Do **not** add `expo-av`, React Query, or new video SDKs without user approval.

---

## Data model

### `types/country.ts`

```ts
export type CountryVideo = {
  /** Direct MP4 (or HLS) URL from backend — never a page link. */
  url: string;
  /** Still frame for loading / poster fallback. */
  poster?: string;
  /** Source attribution (e.g. "pexels", "demo"). */
  provider?: string;
  /** Duration in seconds when known. */
  duration?: number;
};

export type Country = {
  // ...existing fields
  images?: string[];
  videos?: CountryVideo[];
};
```

### Normalization helpers — `lib/format-country.ts`

| Function                       | Behavior                                                                 |
| ------------------------------ | ------------------------------------------------------------------------ |
| `getCountryVideos(country)`    | Normalized `CountryVideo[]` — dedupe by `url`, drop invalid URLs         |
| `getCultureVideo(country)`     | First valid video (`videos[0]`) for Culture tab                          |
| `hasCultureVideo(country)`     | `true` when `getCultureVideo` returns non-null                           |
| `getCulturePosterUri(country)` | `video.poster ?? images[0] ?? flag` for loading state and empty fallback |

**Dev fallback (`__DEV__` only):** when backend returns no videos, `getCountryVideos` injects a demo clip (`provider: "demo"`) so Culture is testable without `PEXELS_API_KEY`. `CultureVideoSlide` maps `provider === "demo"` to `constants/videos.ts` bundled asset.

---

## Backend dependency

### `prompts-worldloop/15-video-service.md`

`video.service.ts` enriches countries with 0–1 MP4 per country from Pexels Video API, cached in Redis (`videos:{country}`).

### Culture feed endpoint

`backend/src/services/culture-feed.service.ts` + `GET /feed/culture/countries`:

| Query param    | Purpose                                      |
| -------------- | -------------------------------------------- |
| `seed`         | Session shuffle seed (stable order per seed) |
| `cursor`       | Offset pagination                            |
| `limit`        | Page size (default 20)                       |
| `displayWidth` | Hero image variant selection (posters)       |

Response:

```json
{
  "data": [
    /* Country[] with videos[], images[], ai */
  ],
  "nextCursor": "20",
  "meta": { "total": 142, "seed": "session-abc" }
}
```

**Server behavior:**

1. Build/cache a **video-country index** (countries that have at least one cached video)
2. `seededShuffle` the index for deterministic per-session order
3. Enrich each page slice: images + videos + AI
4. Only countries with videos appear in the feed index

Mobile client: `fetchCultureFeedCountries(seed, cursor, limit)` in `lib/api.ts`.

---

## Route & files

| Path                                             | Purpose                                                        |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `app/(tabs)/culture.tsx`                         | Culture screen — loading / error / empty / `CultureFeed`       |
| `components/culture/culture-feed.tsx`            | Vertical `FlatList`, viewability, pagination, pull-to-refresh  |
| `components/culture/culture-country-page.tsx`    | Single full-screen page: video or poster fallback + overlay    |
| `components/culture/culture-video-slide.tsx`     | `expo-video` player, poster, error fallback, AppState pause    |
| `components/culture/culture-overlay.tsx`         | Bottom scrim, country card, AI fact, `ExploreActionRail`       |
| `components/culture/culture-top-bar.tsx`         | `WorldLoopHeader` + feed menu + search (`context: "culture"`)  |
| `components/culture/culture-feed-menu-sheet.tsx` | For You / continent filters                                    |
| `components/culture/culture-empty.tsx`           | Empty state when no video countries match filter               |
| `store/use-culture-feed-store.ts`                | Feed state, region filter, sort, mute, `focusCountryInCulture` |
| `lib/culture-session-seed.ts`                    | Stable per-install session seed for shuffle                    |
| `lib/format-country.ts`                          | `getCultureVideo`, `hasCultureVideo`, `getCulturePosterUri`    |
| `constants/culture-chrome.ts`                    | Header icon sizes, action-rail offsets                         |
| `constants/videos.ts`                            | Bundled demo clip for `__DEV__` / `provider: "demo"`           |
| `features/navigation/open-country-in-culture.ts` | Search → focus country in Culture feed                         |

**Reuse from Explore (do not duplicate):**

- `components/explore/country-image.tsx` — poster + flag placeholder
- `components/explore/explore-action-rail.tsx` — `variant="culture"` (mute toggle, sort, share, saved)
- `components/explore/explore-error.tsx` — shared error UI

---

## Frontend implementation

### 1. `CultureFeed`

Mirror `ExploreFeed` vertical paging:

- `pagingEnabled`, `decelerationRate="fast"`, `windowSize={3}`, `maxToRenderPerBatch={2}`, `removeClippedSubviews`
- `onViewableItemsChanged` at 50% threshold → `setCurrentIndex`, `recordCountryVisit`, prefetch profiles
- `isActive={isTabFocused && index === currentIndex}` passed to each page
- `RefreshControl` → `refreshCultureFeed()`
- Extend feed when `index >= length - 2`

### 2. `CultureCountryPage`

```ts
const video = getCultureVideo(country);
const posterUri = getCulturePosterUri(country);
```

- **Has video:** render `CultureVideoSlide` + `CultureOverlay`
- **No video:** render poster `CountryImage` + overlay (edge case; feed should filter these out)

### 3. `CultureVideoSlide`

Follow `OnboardingBackgroundVideo` + Culture implementation:

```tsx
const player = useVideoPlayer(source, (instance) => {
  instance.loop = true;
  instance.muted = true;
});

useEffect(() => {
  player.muted = isMuted;
  if (isActive) {
    player.play();
    return;
  }
  player.pause();
}, [isActive, isMuted, player]);
```

| Prop        | Purpose                                                    |
| ----------- | ---------------------------------------------------------- |
| `video`     | `CountryVideo` from `getCultureVideo`                      |
| `posterUri` | Shown until `playingChange` or on error                    |
| `isActive`  | Tab focused + page is current index                        |
| `isMuted`   | From `useCultureFeedStore.isMuted` (toggle on action rail) |

`VideoView` settings:

- `contentFit="cover"`
- `nativeControls={false}`
- `allowsPictureInPicture={false}`

**AppState:** pause on `background` / `inactive`; resume on `active` when `isActive`.

**Error:** `statusChange === "error"` → hide `VideoView`, show poster via `CountryImage`.

**Demo source:** `resolveVideoSource` returns `constants/videos.onboardingHero` when `provider === "demo"`.

### 4. `CultureOverlay`

TikTok-style bottom chrome:

- `LinearGradient` scrim on lower ~38% only (hero stays bright)
- Flag + country name → tap opens AI explorer (`openCountryAiExplorer`)
- Expandable AI fact line
- `ExploreActionRail` with `variant="culture"` — mute, sort, share, bookmark

### 5. `useCultureFeedStore`

Key behaviors:

| Action                   | Behavior                                                          |
| ------------------------ | ----------------------------------------------------------------- |
| `loadInitialFeed`        | Fetch with session seed; client-filter `hasCultureVideo`          |
| `setRegionFilter`        | Region-scoped video countries; cache per region                   |
| `toggleMuted`            | Global mute for all Culture players                               |
| `focusCountryInCulture`  | Insert/move country to index 0; bump `focusEpoch` to remount list |
| `extendCultureFeedAtEnd` | Paginate with `nextCursor`                                        |

### 6. Playback lifecycle (critical)

Only **one** video should play at a time:

| State                               | Behavior                                |
| ----------------------------------- | --------------------------------------- |
| Culture tab unfocused               | **Pause** all players                   |
| Page off-screen (vertical swipe)    | **Pause** that page                     |
| Page active + tab focused           | **Play** (muted, loop)                  |
| App background                      | **Pause** all                           |
| User opens AI explorer from overlay | Hero video pauses via tab/page inactive |

`isActive` is computed in `CultureFeed`: `isTabFocused && index === currentIndex`.

---

## UI breakdown

Match Culture tab chrome — full-bleed video, minimal top header:

| Area             | Behavior                                                           |
| ---------------- | ------------------------------------------------------------------ |
| Hero region      | Edge-to-edge video; no horizontal pager; no dot carousel           |
| `CultureTopBar`  | Frosted `WorldLoopHeader`; no live-video backdrop (unlike Explore) |
| `CultureOverlay` | Bottom card + action rail; tab bar overlap via negative clearance  |
| Tab bar          | Culture tab icon; same custom `bottom-tab-bar.tsx`                 |

Styling:

- Prefer **StyleSheet** for `VideoView`, `FlatList`, gradients
- NativeWind only where sibling explore/culture components already use it
- No `className` on `SafeAreaView`

---

## Performance & memory

- Same FlatList tuning as Explore (`windowSize={3}`, etc.)
- One `useVideoPlayer` per visible page — pause (don't destroy) on swipe away
- Backend returns **at most 1** video per country
- Do not preload videos for feed neighbors (posters only via `CountryImage` prefetch)
- Culture index on server avoids shipping countries with no video through pagination

---

## Out of scope

- Mixed image + video horizontal carousel on Explore (`HeroImagePager` stays image-only)
- User-uploaded video
- Inline narration / TTS (Listen button stays placeholder on Explore)
- HLS adaptive streaming (MP4 only for v1)
- Picture-in-picture
- Multiple videos per country page (v1 = first clip only)
- AI-generated video

---

## Acceptance criteria

- Culture tab shows vertical full-screen video feed for countries with `videos[]`
- Active page autoplays muted loop when tab is focused
- Swiping **up/down** pauses previous video and plays the new active page
- Mute toggle on action rail affects active player
- Countries without backend videos are excluded from feed (not shown as blank pages)
- Video load error shows poster/flag fallback without red screen
- `GET /feed/culture/countries` drives pagination with session `seed`
- Search can open a country in Culture via `openCountryInCulture`
- No `expo-av` imports; only `expo-video`
- `npm run lint` and `npm run typecheck` pass
- Backend returns `videos: []` gracefully when Pexels key missing (Culture feed may be empty; `__DEV__` demo clip still works)

---

## Testing

```bash
# Terminal 1 — backend + Redis
docker compose up -d redis
cd backend && npm run dev

# Terminal 2
npx expo start
```

1. Open **Culture** tab — first country with video autoplays muted
2. Swipe **up** — previous video pauses, new country plays
3. Switch to **Explore** tab — Culture video pauses
4. Return to Culture — active page resumes
5. Tap **mute** on action rail — audio state toggles (still muted by default on reopen)
6. Tap country name → AI explorer opens
7. Background app → video pauses; foreground resumes
8. Search → open country in Culture → feed focuses that country
9. Android: scroll 10+ countries — no OOM/crash

**Backend curl:**

```bash
curl -s "http://localhost:3001/feed/culture/countries?seed=test&limit=3" | jq '.data[] | {name, videos: .videos | length}'
```

**Dev without Pexels key:** `getCountryVideos` demo fallback + bundled `onboardingHero` mp4.

---

## Next steps

1. Optional: AI explorer hero video — reuse `CultureVideoSlide` patterns in profile hero carousel
2. Optional: persist mute preference to AsyncStorage
3. Optional: prefetch poster frames for next culture page (not full video files)
4. Optional v2: multiple clips per country (horizontal pager within Culture page)
