Read AGENTS.md first and follow it strictly.

Parent: [`08-zustand.md`](./08-zustand.md) · Related: [`12-map-ui.md`](./12-map-ui.md), [`13d-map-v3-ui-ux-upgrade.md`](./13d-map-v3-ui-ux-upgrade.md), `prompts-worldloop/08-redis-caching-layer.md`

## Client-side cache (AsyncStorage)

**Goal:** Persist hot API payloads on device so Map and Explore feel instant on cold start, while still refreshing from the backend in the background. Complements server Redis — it does not replace it.

---

## Problem

Today the app relies on:

| Layer                | Behavior                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Backend Redis**    | Caches `map:countries`, `country:{name}`, `feed:countries`, etc. — only helps after a network round-trip    |
| **Zustand (memory)** | `use-map-store` skips refetch until process death; `use-country-feed-store` keeps `regionCache` in RAM only |
| **AsyncStorage**     | Used for small UI prefs (map onboarding, saved countries) — not yet used for API payloads                   |
| **Plain `fetch`**    | Every app launch re-downloads map countries and preview country details                                     |

Users see a loading spinner on Map even when they opened the tab yesterday. Preview cards refetch `GET /country/:name` on every open.

---

## Solution overview

Use **`@react-native-async-storage/async-storage`** (already in the project) for **API response caching** with TTL and **stale-while-revalidate (SWR)**.

```txt
Screen / store action
        │
        ▼
  await clientCache.get(key)  ──► hit + fresh? ──► return (async)
        │ miss or stale
        ▼
  show cached data if any (stale OK for UI)
        │
        ▼
  fetch(API) ──► await clientCache.set(key) ──► update Zustand
```

**Design rules**

1. **AsyncStorage for API payloads** — map list, country detail, optional feed first page. Use a dedicated key prefix (`cache:`) separate from Zustand `persist` keys.
2. **Keep Zustand as source of truth in memory** — AsyncStorage is hydration + offline backup, not a second state manager.
3. **SWR everywhere** — render cached data first, refresh in background, swap when newer data arrives.
4. **Do not cache secrets** — only public backend JSON already returned by `lib/api.ts`.
5. **Async reads** — AsyncStorage is async; hydrate on mount with `await getClientCache` before or alongside network fetch. Accept one brief frame of loading on cold start if cache read is slower than memory.

---

## Prerequisites

- [`08-zustand.md`](./08-zustand.md) completed — `lib/api.ts`, feed + map stores exist
- [`12-map-ui.md`](./12-map-ui.md) / map v2+ wired — `use-map-store`, `MapCountryPreviewCard`
- Backend running with Redis (optional but recommended for fast background refresh)
- `@react-native-async-storage/async-storage` already installed (used by saved countries, map UI prefs, etc.)

---

## Dependencies

No new packages required. Reuse the existing AsyncStorage dependency:

```bash
# Already in package.json — verify only
npm ls @react-native-async-storage/async-storage
```

Do **not** add React Query, TanStack Query, axios, or MMKV. One small `lib/client-cache.ts` plus a thin storage wrapper is enough for this teaching project.

Works in **Expo Go** and dev clients — no native rebuild needed.

---

## Files to add or change

| Path                                          | Purpose                                                             |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `lib/client-storage.ts`                       | AsyncStorage read/write/delete helpers with shared key prefix       |
| `lib/client-cache.ts`                         | Typed keys, TTL, async `get` / `set` / `remove`, SWR helper         |
| `constants/client-cache.ts`                   | Cache key prefixes + TTL seconds (mirror backend where sensible)    |
| `store/use-map-store.ts`                      | Hydrate from AsyncStorage on load; background refresh               |
| `components/map/map-country-preview-card.tsx` | Country detail SWR (cache → fetch)                                  |
| `lib/api.ts`                                  | Optional thin wrappers — prefer cache in stores, not inside `fetch` |
| `store/use-country-feed-store.ts`             | _(Optional)_ Persist first feed page + `regionCache` snapshot       |

**Out of scope for AsyncStorage:** parsed GeoJSON boundary polygons — keep a **module-level memo** in `lib/map-country-boundaries.ts` (single parse per app session). The asset is already bundled; duplicating multi-MB JSON into AsyncStorage hurts more than it helps.

---

## `constants/client-cache.ts`

Define versioned keys and TTLs (seconds):

```ts
export const CLIENT_CACHE_SCHEMA_VERSION = 1;

export const CLIENT_CACHE_KEYS = {
  schemaVersion: "cache:meta:schemaVersion",
  mapCountries: "cache:map:countries",
  countryDetail: (name: string) => `cache:country:${name.trim().toLowerCase()}`,
  feedFirstPage: "cache:feed:countries:cursor=all",
  feedRegion: (region: string) =>
    `cache:feed:region:${region.trim().toLowerCase()}`,
} as const;

/** Align with prompts-worldloop TTLs where it matters. */
export const CLIENT_CACHE_TTL = {
  mapCountries: 30 * 24 * 60 * 60, // 30d — match backend map TTL
  countryDetail: 7 * 24 * 60 * 60, // 7d — AI + images can change
  feedFirstPage: 24 * 60 * 60, // 1d — feed order is shuffled server-side
  feedRegion: 7 * 24 * 60 * 60,
} as const;
```

Bump `CLIENT_CACHE_SCHEMA_VERSION` and clear keys when `Country` / `MapCountry` shapes change.

---

## `lib/client-storage.ts`

Thin wrapper around AsyncStorage for cache entries only (do not mix with Zustand `persist` keys):

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readCacheString(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function writeCacheString(
  key: string,
  value: string,
): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function deleteCacheKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function getAllCacheKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith("cache:"));
}
```

Use `getAllCacheKeys()` in `clearAllClientCache()` — do not call `AsyncStorage.clear()` (that would wipe bookmarks and UI prefs).

---

## `lib/client-cache.ts`

### Envelope type

Wrap every cached value:

```ts
type CacheEnvelope<T> = {
  v: number; // CLIENT_CACHE_SCHEMA_VERSION
  savedAt: number; // Date.now()
  ttlSeconds: number;
  data: T;
};
```

### API (minimum)

All methods are **async** because AsyncStorage is async:

```ts
export async function getClientCache<T>(key: string): Promise<{
  data: T | null;
  isFresh: boolean;
  isStale: boolean;
  savedAt: number | null;
}>;

export async function setClientCache<T>(
  key: string,
  data: T,
  ttlSeconds: number,
): Promise<void>;

export async function removeClientCache(key: string): Promise<void>;

export async function clearAllClientCache(): Promise<void>; // dev helper
```

- **`isFresh`** — `savedAt + ttl > now`
- **`isStale`** — envelope exists but TTL expired (still return `data` for SWR UI)
- On read: if `v !== CLIENT_CACHE_SCHEMA_VERSION`, delete key and return miss
- JSON `parse` / `stringify` in try/catch — corrupt entry → delete key

### SWR helper (teachable, small)

```ts
export async function staleWhileRevalidate<T>(options: {
  key: string;
  ttlSeconds: number;
  fetcher: () => Promise<T>;
  onCached?: (data: T, meta: { isFresh: boolean }) => void;
  onFetched?: (data: T) => void;
}): Promise<T>;
```

Flow:

1. `await getClientCache` → if data exists, call `onCached` immediately.
2. If fresh, return without network (optional `force` flag for pull-to-refresh later).
3. If stale or miss, run `fetcher`, `await setClientCache`, `onFetched`, return.

---

## Wire `use-map-store`

Update `loadMapCountries`:

1. **Async hydrate** — `await getClientCache<MapCountry[]>(CLIENT_CACHE_KEYS.mapCountries)`.
   - If data exists: `set({ countries: withValidCoordinates(data), status: "idle", mapCountriesFullyLoaded: true })` before or while the network refresh runs.
2. **Background refresh** — call `staleWhileRevalidate`:
   - `fetcher`: `() => fetchMapCountries().then((r) => r.data)`
   - `onCached`: hydrate store from disk (same as step 1 if not already applied)
   - `onFetched`: update `countries` + `mapCountriesFullyLoaded`
   - If offline and only stale cache exists, keep showing cache; set `error` only when miss + network fails
3. Keep `mapCountriesLoadPromise` deduping so two tabs don’t double-fetch.

**Do not** persist the entire Zustand map slice via `persist` middleware — only the API list goes through `client-cache.ts` (explicit TTL). Keep Zustand `persist` keys (`saved-countries`, `map-ui`, etc.) separate from `cache:*` keys.

---

## Wire `MapCountryPreviewCard`

Replace the bare `useEffect` + `fetchCountryByName` with SWR:

1. On `country.name` change, `await` read `CLIENT_CACHE_KEYS.countryDetail(name)`.
2. If hit → `setDetail(cached)` immediately, `detailStatus: "idle"`.
3. Run `staleWhileRevalidate` with `fetchCountryByName` as fetcher.
4. While revalidating stale data, show existing fact (no full-card spinner). Show spinner only when **no** cached detail exists.

Cancel in-flight updates on unmount / name change (keep existing `cancelled` flag pattern).

---

## Optional: feed store

Lower priority than Map; implement if time allows:

| Key                   | When to write                          | When to read                         |
| --------------------- | -------------------------------------- | ------------------------------------ |
| `feedFirstPage`       | After successful `loadInitialFeed`     | Before first fetch on cold start     |
| `feedRegion:{region}` | After `ensureRegionCountries` resolves | Before `fetchExploreRegionCountries` |

Keep in-memory `regionCache` as today — AsyncStorage repopulates it on launch so Explore region chips don’t flash empty.

**Do not** persist paginated tail (`loadMoreFeed`) — unbounded growth.

---

## Boundary polygons (memory only)

In `lib/map-country-boundaries.ts` add:

```ts
let parsedCountryBoundaries: CountryBoundaryPolygon[] | null = null;

export function getCountryBoundaryPolygons(
  geoJson: GeoJsonFeatureCollection,
): CountryBoundaryPolygon[] {
  if (!parsedCountryBoundaries) {
    parsedCountryBoundaries = parseCountryBoundaryPolygons(geoJson);
  }
  return parsedCountryBoundaries;
}
```

Replace duplicate `useMemo(() => parseCountryBoundaryPolygons(...), [])` in map/globe components with this helper. **Not** AsyncStorage.

---

## Invalidation & dev tools

| Trigger              | Action                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| Schema version bump  | `await clearAllClientCache()` on app start (once) or migration in `getClientCache` |
| User logout (future) | Clear country + feed caches; keep map UI prefs                                     |
| Dev menu / settings  | “Clear local cache” button calling `clearAllClientCache()`                         |

Log in `__DEV__` only:

```ts
console.log("[client-cache]", { key, hit: !!data, isFresh, isStale });
```

---

## Out of scope

- Caching image binary data in AsyncStorage (continue `expo-image` `cachePolicy="memory-disk"`)
- Replacing backend Redis or changing TTLs server-side
- Caching AI generation client-side beyond what `GET /country/:name` already returns
- Search results persistence (ephemeral; optional later)
- Full offline mode / queue writes
- MMKV or other native-only storage (keep this prompt AsyncStorage-only for simplicity)

---

## Acceptance criteria

- [ ] No new dependencies; `@react-native-async-storage/async-storage` used via `lib/client-storage.ts`
- [ ] Map tab shows countries **immediately** on second launch (minimal or no spinner) when cache exists, then silently refreshes
- [ ] Airplane mode after one successful load: map still shows last cached countries; error only if never cached
- [ ] Preview card shows cached fun fact instantly on re-open; network refresh updates text when backend changed
- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] Web build works — AsyncStorage is supported on web in this stack
- [ ] No API keys or secrets in AsyncStorage cache keys
- [ ] `clearAllClientCache` only removes `cache:*` keys — bookmarks and UI prefs survive
- [ ] `clearAllClientCache` documented for students (dev button or comment in `lib/client-cache.ts`)

---

## Testing

```bash
# Terminal 1 — repo root
docker compose up -d redis

# Terminal 2
cd backend && npm run dev

# Terminal 3 — Expo Go or dev client
npx expo start
```

1. Open Map — wait for countries to load (network).
2. Kill app fully; relaunch — countries should appear quickly from AsyncStorage (watch `[client-cache]` logs).
3. Open a country preview — dismiss — reopen same country; fact should appear instantly.
4. Toggle airplane mode — Map still shows cached list; preview uses cached detail if available.
5. Call `await clearAllClientCache()` — next launch shows loading again until fetch completes.
6. Confirm saved countries and map UI prefs still exist after clearing API cache.

---

## Architecture note (teaching)

| Store          | Server cache (Redis)                 | Client cache (AsyncStorage)                  |
| -------------- | ------------------------------------ | -------------------------------------------- |
| Map countries  | `map:countries`                      | `cache:map:countries`                        |
| Country detail | `country:{name}` + `ai:` + `images:` | `cache:country:{name}`                       |
| Feed page      | `feed:countries:{cursor}`            | `cache:feed:countries:cursor=all` (optional) |

Redis avoids repeated **origin** work; AsyncStorage avoids repeated **network** work. Together: fast server + faster UI on relaunch.

**Trade-off (teaching moment):** AsyncStorage is slower than MMKV for large JSON and reads are async. For this project’s payload sizes (map list + country detail), that is acceptable and keeps the stack simpler — one storage library students already use for Zustand `persist`.

---

## Next steps

- Pull-to-refresh on Map calling `loadMapCountries({ force: true })` bypassing fresh TTL
- Prefetch top N country details after map hydrate (background, low priority)
- EAS Update hook to bump `CLIENT_CACHE_SCHEMA_VERSION` when API shapes ship OTA
- _(Optional stretch)_ Migrate to MMKV if cache size or sync reads become a bottleneck
