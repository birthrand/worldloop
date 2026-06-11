Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`, `prompts-worldloop/03-image-service.md`, `prompts-worldloop/05-feed-endpoint.md`, `prompts/17-culture-video-feed.md`

Implement **Feature 15: Video Service** — one short travel clip per country for the Culture tab video feed.

## Goal

Provide **0–1 playable MP4 URLs** per country so the mobile Culture tab can autoplay muted looping video (see `prompts/17-culture-video-feed.md`).

Provider chain (v1):

1. **Pexels Video API** (primary) — reuse existing `PEXELS_API_KEY`
2. **Empty array** — endpoint must still succeed when Pexels returns nothing or the key is missing

Do **not** call video APIs from the Expo app. URLs only — no hosting or transcoding on WorldLoop servers.

---

## Current state

- `backend/src/services/image.service.ts` — images via Unsplash → Pexels → Wikipedia; Redis key `images:{country}`
- `backend/src/services/feed.service.ts` — `enrichCountry()` = images + AI
- `backend/src/types/country.ts` — no `videos` field yet
- `backend/src/lib/upstream-validation.ts` — `parsePexelsResults()` for **photos** only
- Mobile Explore hero is image-only (`HeroImagePager`); Culture tab owns video playback

This prompt adds a **parallel enrichment service** for video, mirroring the image service patterns.

---

## Prerequisites (all required)

- `01-country-data-service.md` completed — country `name`, `cca2`, `capital`
- **`02-local-redis-setup.md` completed** — Redis running and verified
- `03-image-service.md` completed — recommended for poster fallback (`images[0]`)
- `05-feed-endpoint.md` completed — feed enrichment pipeline exists

---

## Data model

### `backend/src/types/country.ts`

Add:

```ts
export type CountryVideo = {
  /** Direct HTTPS MP4 URL (not a Pexels watch page). */
  url: string;
  /** Still frame for loading / header blur backdrop. */
  poster?: string;
  /** Upstream label, e.g. "pexels". */
  provider?: string;
  /** Duration in whole seconds when known. */
  duration?: number;
};

export type Country = {
  // ...existing fields
  images?: string[];
  videos?: CountryVideo[];
};
```

**Contract:**

- `videos` is always an array when present (`[]` or one item in v1)
- v1 returns **at most 1** video per country
- `url` must be `https://` and end in `.mp4` (or known Pexels CDN MP4 path)

Mirror the same types in mobile `types/country.ts` when implementing `prompts/17-culture-video-feed.md`.

---

## Scope

### 1. `backend/src/services/video.service.ts`

Create a dedicated service (do not bolt video fetching onto `image.service.ts`).

| Export                                     | Purpose                                     |
| ------------------------------------------ | ------------------------------------------- |
| `getVideosForCountry(countryName: string)` | Cache-first fetch; returns `CountryVideo[]` |
| `enrichCountryWithVideos(country)`         | Merge `videos` onto a country object        |
| `enrichCountriesWithVideos(countries)`     | Batch helper (optional)                     |

**Cache:**

- Key: `videos:{country}` via `cacheKeys.videos(name)` — lowercase trimmed country name (same convention as `images:`)
- TTL: 30 days — add `videos: 30 * 24 * 60 * 60` to `CACHE_TTL` in `cache.service.ts`

**Fetch when cache miss:**

1. If `!env.pexelsApiKey` → return `[]` (log once at debug level, do not throw)
2. Call Pexels Video Search API
3. Pick the best matching clip (see selection rules)
4. Normalize to `CountryVideo[]` (0 or 1 item)
5. Store in Redis

### 2. Pexels Video API

**Endpoint:** `GET https://api.pexels.com/videos/search`

**Headers:** `Authorization: {PEXELS_API_KEY}` (same as photo search in `image.service.ts`)

**Query params (v1):**

| Param         | Value                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `query`       | `"{countryName} landscape"` — fallback `"{countryName} travel"` if first query returns 0 videos |
| `per_page`    | `5`                                                                                             |
| `orientation` | `landscape`                                                                                     |

**Response fields to use:**

| Pexels field             | Maps to              |
| ------------------------ | -------------------- |
| `videos[].video_files[]` | Pick one MP4 `link`  |
| `videos[].image`         | `poster`             |
| `videos[].duration`      | `duration` (seconds) |
| —                        | `provider: "pexels"` |

**File selection rules** (first match wins):

1. Prefer `file_type === "video/mp4"`
2. Prefer width **≤ 1280** and **≥ 720** (balance quality vs mobile bandwidth)
3. If none in range, pick smallest width ≥ 640
4. Reject non-HTTPS links and non-MP4 types

Store the **direct file URL** from `video_files[].link`, not `https://www.pexels.com/video/...`.

### 3. `backend/src/lib/upstream-validation.ts`

Add typed parser(s), mirroring `parsePexelsResults`:

```ts
export function parsePexelsVideoResults(data: unknown): PexelsVideoHit[];
```

- Validate response shape; throw `HttpError` with code `UPSTREAM_INVALID` on malformed JSON (same as photos)
- Return normalized hits with `url`, `poster`, `duration` — service layer picks the first suitable hit
- Log and return `[]` on empty `videos` array (not an error)

### 4. Poster fallback

When Pexels provides no `image` on the chosen video:

1. Call `getImagesForCountry(countryName)` and use `images[0]` as `poster`
2. If still none, omit `poster` (mobile falls back to flag placeholder)

Avoid circular imports: video service may import `getImagesForCountry` from `image.service.ts` (images do not import videos).

### 5. Feed integration — `feed.service.ts`

Extend enrichment pipeline:

```ts
async function enrichCountry(country: CountryBasic): Promise<Country> {
  const withImages = await enrichCountryWithImages(country);
  const withVideos = await enrichCountryWithVideos(withImages);
  return enrichCountryWithAi(withVideos);
}
```

Order: **images → videos → AI** so poster fallback and AI facts stay independent.

Feed batch cache keys (`feed:countries:{offset}:{limit}`) already cache fully enriched objects — no separate feed cache change required. After deploy, old feed cache entries lack `videos` until TTL expires; acceptable for dev. Optionally bump feed cache key suffix in a follow-up if you need instant invalidation.

### 6. Other endpoints (recommended)

Merge videos anywhere countries are fully enriched for client hero use:

| Endpoint / service                                     | Action                                                 |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `GET /country/:name/profile` (`profile.controller.ts`) | After images, call `enrichCountryWithVideos`           |
| `GET /country/:name` (`country.controller.ts`)         | Same (optional but keeps parity)                       |
| `search.service.ts`                                    | Same pattern as images if search cards ever show video |

Skip `GET /map/countries` — map pins stay lightweight (`MapCountry` has no video field).

### 7. Logging

Match `image.service.ts` style:

```ts
logger.debug("Video fetched from Pexels", { country, duration });
logger.debug("No video found for country", { country });
logger.warn("Pexels Video API error", { status, country });
```

On cache hit, existing `getOrSet` logging applies.

---

## Out of scope

- Multiple videos per country (v1 = max 1)
- Unsplash video (no stable free API in scope)
- Wikipedia / Wikimedia video files
- YouTube or Vimeo embed URLs
- HLS / DASH adaptive streams
- Uploading or proxying video through WorldLoop CDN
- AI-generated video
- Video pre-generation batch jobs (`10-pregeneration-system.md`)
- Mobile playback UI (`prompts/17-culture-video-feed.md`)

---

## Env vars

| Variable         | Required    | Notes                                                                      |
| ---------------- | ----------- | -------------------------------------------------------------------------- |
| `PEXELS_API_KEY` | Recommended | Same key as `03-image-service.md`; service returns `videos: []` when unset |

No new env vars for v1.

Document in `backend/README.md` under a **Video** subsection next to Images.

---

## Files to create / modify

| Path                                            | Change                                               |
| ----------------------------------------------- | ---------------------------------------------------- |
| `backend/src/types/country.ts`                  | Add `CountryVideo`, optional `videos[]` on `Country` |
| `backend/src/services/video.service.ts`         | **New** — Pexels fetch + cache + enrich helpers      |
| `backend/src/lib/upstream-validation.ts`        | Add Pexels video response parser                     |
| `backend/src/services/cache.service.ts`         | `CACHE_TTL.videos`, `cacheKeys.videos()`             |
| `backend/src/services/feed.service.ts`          | Video step in `enrichCountry`                        |
| `backend/src/controllers/profile.controller.ts` | Enrich with videos (recommended)                     |
| `backend/README.md`                             | Env + curl test for video field                      |

---

## Acceptance criteria

- `GET /feed/countries` returns countries with `videos: CountryVideo[]` when Pexels succeeds
- Each video object has a valid HTTPS MP4 `url`
- `poster` is populated when Pexels or image service provides a still
- Missing `PEXELS_API_KEY` or upstream failure → `videos: []`; HTTP **200** unchanged
- Redis key `videos:{country}` caches results; second request logs cache hit
- No Pexels key or direct MP4 URLs in the Expo app
- `npm run lint` and `npm run typecheck` pass in `backend/`
- Feed pagination (`nextCursor`) behavior unchanged

---

## Testing

```bash
# Backend running with Redis + PEXELS_API_KEY in backend/.env
cd backend && npm run dev
```

**1. Single country (via feed slice or profile):**

```bash
curl -s "http://localhost:3001/country/Japan/profile" | jq '.data.country.videos'
```

Expect:

```json
[
  {
    "url": "https://videos.pexels.com/.../....mp4",
    "poster": "https://images.pexels.com/...",
    "provider": "pexels",
    "duration": 14
  }
]
```

**2. Cache hit** — repeat request; logs should show Redis cache hit for `videos:japan`.

**3. No API key** — unset `PEXELS_API_KEY`, restart, same endpoint → `"videos": []`, status 200.

**4. Feed batch:**

```bash
curl -s "http://localhost:3001/feed/countries?limit=3" | jq '.data[] | {name, videos: .videos | length}'
```

**5. Invalid upstream** — mock 502 from Pexels in unit test or temporary throw; endpoint still returns country without video.

After backend is verified, implement mobile playback per `prompts/17-culture-video-feed.md`.

---

## Performance notes

- Fetch **one** video per country — Culture v1 only plays the first clip
- Video enrichment runs in parallel per country inside `Promise.all` in feed batches (same as images/AI today)
- Consider skipping video fetch when `PEXELS_API_KEY` is empty (short-circuit before HTTP)
- Do not block feed on slow Pexels responses beyond existing upstream timeout patterns — fail open to `[]`

---

## Next steps

1. `prompts/17-culture-video-feed.md` — Culture tab `CultureVideoSlide` + `expo-video`
2. Optional: bump feed Redis cache version if you need immediate `videos` on all cached batches
3. Optional v2: second provider (Mixkit static catalog keyed by region) when Pexels has no country match
