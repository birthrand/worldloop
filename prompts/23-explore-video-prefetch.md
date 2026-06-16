Read `AGENTS.md` first and follow it strictly.

Reference: `prompts/10f-explore-swipe-deck-prefetch.md`, `prompts/21-explore-culture-hero-toggle.md`, `prompts/22-static-country-videos.md`, `lib/prefetch-feed-heroes.ts`, `components/culture/culture-video-slide.tsx`, `components/explore/explore-swipe-card.tsx`, `components/explore/explore-swipe-deck.tsx`

Speed up **Explore culture video mode** — static `videos[]` URLs are instant to resolve, but MP4 bytes still download at playback time. Mirror the hero **image** prefetch pipeline for culture **video** bytes.

---

## Goal

When the user toggles Explore hero to video mode (or swipes while in video mode), clips should start playing faster with no extra API calls.

| Technique                  | When                                                    | Purpose                                                                           |
| -------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Pre-toggle warm**        | Every mounted `ExploreSwipeCard` with `hasCultureVideo` | Buffer current country before user taps culture icon                              |
| **Rolling video prefetch** | `heroMediaMode === "video"` + index window              | Warm current … +3 (and −1) MP4 URLs via headless players                          |
| **Swipe-begin warm**       | User starts vertical drag in video mode                 | Extra ~200–400 ms to finish next clip before dismiss                              |
| **Stack paused player**    | Next card only, video mode only                         | `CultureVideoSlide` with `isActive={false}` fills native cache for imminent swipe |

---

## Architecture

```text
ExploreSwipeDeck
  ├── prefetchFeedHeroImagesAroundIndex   (always — existing)
  ├── prefetchFeedVideosAroundIndex         (video mode only — new)
  ├── warmFeedVideosOnSwipeBegin          (video mode only — new)
  └── SwipeableTopCard
        ├── top card    → ExploreSwipeCard interactive + warmCountryCultureVideo on mount
        └── next card   → ExploreSwipeCard stackVideoPreload (paused CultureVideoSlide)
```

### What static already solved

- `country.videos[0].url` is bundled in `data/countries.json`
- No culture feed network round-trip for URLs

### What is still slow

- `CultureVideoSlide` creates `useVideoPlayer` on first paint in video mode
- Stack cards previously showed skeleton only (`interactive={false}` blocked player mount)
- No rolling prefetch for MP4 bytes (images had `prefetch-feed-heroes.ts`)

---

## Headless prefetch (`lib/prefetch-feed-videos.ts`)

Mirror `lib/prefetch-feed-heroes.ts` and `components/explore/country-image.tsx` dedupe pattern.

### Player pool (`lib/culture-video-player-pool.ts`) — **v2 fix**

Headless `createVideoPlayer` + `release()` did **not** speed up `CultureVideoSlide`, because each mount still created a **new** `useVideoPlayer`. The pool keeps one native player per URL across unmounts so the stack card → top card handoff reuses the same buffered player.

| Export                                  | Role                                    |
| --------------------------------------- | --------------------------------------- |
| `touchPooledCultureVideoPlayer(source)` | Get or create pooled player (LRU cap 6) |
| `cultureVideoSourceKey(source)`         | Dedupe key for URL / bundled asset      |

### Prefetch module API

| Export                                            | Role                                                       |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `warmCountryCultureVideo(country)`                | Fire-and-forget single-country warm (pre-toggle)           |
| `prefetchFeedVideosAroundIndex(countries, index)` | Rolling window using `FEED_HERO_PREFETCH_AHEAD` / `BEHIND` |
| `warmFeedVideosOnSwipeBegin(countries, index)`    | Prioritize next URL, then window                           |
| `isCultureVideoReady(url)`                        | Optional — true when headless warm reached `readyToPlay`   |

### Implementation notes

- Use **pooled** `createVideoPlayer(url)` — do **not** `release()` after warm (LRU evicts instead)
- `CultureVideoSlide` uses the pool instead of `useVideoPlayer`
- Reveal video on `readyToPlay`, not only `playingChange` (buffered ≠ first frame played)
- Skip `provider === "demo"` and invalid URLs
- Dedupe with `warmedVideoUrls` + `inflightPrefetches` maps
- Reuse window constants from `prefetch-feed-heroes.ts`

### Hidden preload on every mounted card (v2)

Mount `CultureVideoSlide` **behind** `HeroImagePager` (opacity 0) whenever `cultureVideo` exists — even in image mode. Toggling to video reuses the same player instance; no cold mount.

**Do not** rely on headless-only prefetch for mounted cards — `VideoView` + pool is required for reliable buffering.

---

## Card changes (`explore-swipe-card.tsx`)

### Pre-toggle warm + stack buffer

Mount hidden `CultureVideoSlide` behind `HeroImagePager` when `cultureVideo` exists (`opacity: 0`, `isActive={false}`). Visible when `heroMode === "video"`. Use `loadingPlaceholder="poster"` for instant still frame.

```tsx
{
  cultureVideo ? (
    <CultureVideoSlide
      isActive={heroMode === "video" && interactive}
      loadingPlaceholder="poster"
    />
  ) : null;
}
{
  heroMode === "image" ? <HeroImagePager /> : null;
}
```

Top and next stack cards both keep a pooled player; swipe reuses the same native instance.

---

## Deck wiring (`explore-swipe-deck.tsx`)

```ts
// Always
void prefetchFeedHeroImagesAroundIndex(countries, currentIndex);
void prefetchFeedVideosAroundIndex(countries, currentIndex);

// Swipe begin
warmFeedHeroesOnSwipeBegin(countries, currentIndex);
warmFeedVideosOnSwipeBegin(countries, currentIndex);
```

Next stack card:

```tsx
<ExploreSwipeCard
  ...
  heroMediaMode={heroMediaMode}
  stackVideoPreload={heroMediaMode === "video"}
/>
```

Top and previous cards: `stackVideoPreload={false}` (default).

---

## Performance guardrails

| Rule                                         | Reason                                       |
| -------------------------------------------- | -------------------------------------------- |
| Headless prefetch only for index window      | Bounded network + memory                     |
| One paused player on stack (next card)       | Matches `EXPLORE_SWIPE_STACK_DEPTH = 1`      |
| No video prefetch in image mode window       | Avoid downloading 250 MP4s users never watch |
| Pre-toggle warm is per mounted card only     | At most 2 cards (top + next)                 |
| Release headless players after `readyToPlay` | Free player handles; keep native cache       |

---

## Out of scope

- Culture tab feed prefetch (separate surface)
- Smaller MP4 URLs in catalog (data pipeline — `prompts/22-*`)
- Poster instead of skeleton in Explore (UX polish — optional follow-up)
- Bundling MP4 assets into `assets/`

---

## Test plan

1. Image mode — no extra video network traffic when swiping 10 countries (verify in dev tools).
2. Toggle video on country with `videos[]` — clip starts faster on second visit to same country in session.
3. Video mode — forward swipe: next card plays sooner than before (paused stack player + prefetch).
4. Video mode — swipe-begin: next clip has head start during dismiss animation.
5. Country without `videos[]` — no prefetch errors; culture toggle still disabled.
6. Airplane mode after prior warm — replay from cache when possible.
7. `npm run lint` and `npm run typecheck` pass.

---

## File map

| File                                        | Change                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| `prompts/23-explore-video-prefetch.md`      | This doc                                                     |
| `lib/prefetch-feed-videos.ts`               | Headless video warm + rolling window                         |
| `components/explore/explore-swipe-card.tsx` | Pre-toggle warm, `stackVideoPreload`, paused stack player    |
| `components/explore/explore-swipe-deck.tsx` | Rolling prefetch, swipe-begin warm, pass `stackVideoPreload` |

---

## Related prompts

| Prompt                                       | Relationship                                       |
| -------------------------------------------- | -------------------------------------------------- |
| `prompts/10f-explore-swipe-deck-prefetch.md` | Image prefetch template                            |
| `prompts/21-explore-culture-hero-toggle.md`  | Video mode hero swap (relaxes stack skeleton rule) |
| `prompts/22-static-country-videos.md`        | Static `videos[]` URL source                       |
