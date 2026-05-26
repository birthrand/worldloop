Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/05-feed-endpoint.md`, `backend/src/types/country.ts`

Implement **client state management** for WorldLoop using Zustand and `@react-native-async-storage/async-storage`. Wire the mobile app to the backend feed API. Do not build the Explore swipe UI yet — that comes in a later prompt.

## Goal

Give the app a typed, teachable state layer for:

- paginated country feed data from `GET /feed/countries`
- the currently focused country in the feed
- saved / bookmarked countries (persisted locally)

Screens added later (Explore, Map, Saved) will consume these stores.

## Prerequisites

- Backend running at `http://localhost:3001` (or your configured URL)
- `prompts-worldloop/05-feed-endpoint.md` completed — feed returns `{ data: Country[], nextCursor: string | null }`
- Design system / NativeWind already set up (do not change existing UI styling on `app/index.tsx` except where noted for dev helpers below)

## Dependencies

Install only what this feature needs:

```bash
npx expo install zustand @react-native-async-storage/async-storage
```

Do not add React Query, axios, or other data libraries unless the user approves.

## Files to add

| Path | Purpose |
|------|---------|
| `types/country.ts` | `Country` type aligned with the backend shape |
| `constants/api.ts` | `API_BASE_URL` from `process.env.EXPO_PUBLIC_API_URL` with a sensible dev default (`http://localhost:3001`) |
| `lib/api.ts` | `fetchFeedCountries(cursor?, limit?)` using `fetch` (no axios) |
| `store/use-country-feed-store.ts` | Feed list, pagination, loading/error, current index |
| `store/use-saved-countries-store.ts` | Bookmarked countries with AsyncStorage persistence |

Optional: `store/index.ts` re-exporting hooks if it keeps imports clean.

## Data model

Mirror the backend `Country` type:

```ts
type Country = {
  name: string;
  capital: string;
  region: string;
  population: number;
  flag: string;
  latlng: [number, number];
  images?: string[];
  ai?: {
    fact: string;
    caption: string;
    narration: string;
  };
};
```

Use `ai.fact` as the fun fact in UI later — do not rename fields on the client unless the backend changes.

## `lib/api.ts`

- `fetchFeedCountries(cursor?: string, limit?: number)` → `Promise<{ data: Country[]; nextCursor: string | null }>`
- Build URL: `${API_BASE_URL}/feed/countries` with optional `cursor` and `limit` query params
- Throw a clear `Error` when `!response.ok` (include status in the message)
- Never put API keys or secrets in the Expo app — only the public backend base URL

## `use-country-feed-store`

State (minimum):

- `countries: Country[]`
- `nextCursor: string | null`
- `currentIndex: number` — index into `countries` for the active feed item
- `status: "idle" | "loading" | "loadingMore" | "error"`
- `error: string | null`

Actions (minimum):

- `loadInitialFeed(limit?: number)` — fetch first page, replace `countries`, set `nextCursor`, reset `currentIndex` to `0`
- `loadMoreFeed(limit?: number)` — no-op if `nextCursor` is `null` or already loading; append `data`, update `nextCursor`
- `setCurrentIndex(index: number)` — clamp to valid range
- `getCurrentCountry()` — derived helper or selector returning `countries[currentIndex]` or `undefined`
- `resetFeed()` — clear list and cursor (useful for dev/testing)

Rules:

- Keep feed data **in memory only** (do not persist the full feed to AsyncStorage)
- Prevent duplicate appends if the same page is fetched twice while loading
- Default `limit` to `20` to match the backend

## `use-saved-countries-store`

State:

- `savedCountries: Country[]` (or `savedByName: Record<string, Country>` — pick one simple approach and document it in code)

Actions:

- `toggleSaved(country: Country)` — add if missing, remove if present (match by `country.name`)
- `isSaved(name: string): boolean`
- `clearSaved()` — remove all bookmarks (for dev testing)

Persistence:

- Use Zustand `persist` middleware with `@react-native-async-storage/async-storage`
- Storage key: e.g. `worldloop-saved-countries`
- Persist **saved countries only**, not the feed store

## Dev helpers on `app/index.tsx`

Keep the existing design-system placeholder layout. Add a small **dev-only** section (below the current content) that:

1. Shows feed status: country count, `nextCursor`, current index, and current country name (if any)
2. Buttons: **Load feed**, **Load more**, **Clear saved**
3. On mount (optional): call `loadInitialFeed()` once so students can verify the API without building Explore yet

Do not redesign the home screen — only append minimal debug controls for this lesson step.

## Out of scope

- TikTok-style Explore screen UI, vertical paging, or media carousel (`prompt_material/explore-screen-ui.png` — later)
- Bottom tabs, Map screen, Saved screen UI
- Search, region filters, or map selection state (add stub fields only if needed; full behavior waits for backend `06-search-and-explore.md`)
- Clerk auth or language-selection flows (legacy prompts — not part of WorldLoop)
- Calling Unsplash, Pexels, OpenAI, or REST Countries directly from the app

## Acceptance criteria

- `npx expo install` dependencies resolve; `npm run lint` passes
- With backend running, **Load feed** fills `countries` with enriched objects (`images`, `ai` when backend provides them)
- **Load more** appends the next batch when `nextCursor` is set; does nothing when `nextCursor` is `null`
- **Toggle saved** (can be tested from dev UI or a temporary button) persists across app reload
- **Clear saved** empties bookmarks in store and AsyncStorage
- No secrets in `lib/api.ts` or env committed to git — document `EXPO_PUBLIC_API_URL` in a comment or `.env.example` if you add one
- Types are strict — avoid `any`

## Testing

```bash
# Terminal 1 — repo root
docker compose up -d redis

# Terminal 2
cd backend && npm run dev

# Terminal 3 — repo root
npx expo start
```

1. Set `EXPO_PUBLIC_API_URL` if not using the default localhost URL (physical device needs your machine’s LAN IP).
2. Tap **Load feed** — expect countries in the dev readout.
3. Tap **Load more** — count increases when `nextCursor` was non-null.
4. Save a country, reload the app — it stays saved until **Clear saved**.

## Next steps

After this prompt: implement Explore feed UI (vertical swipe) and/or `prompts/10-home-ui.md`, consuming `use-country-feed-store` and `use-saved-countries-store` instead of duplicating fetch logic in screens.
