Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`, `prompts-worldloop/04-ai-content-service.md`, `prompts/16-ai-content-explorer-ui.md`

Implement **Feature 13: News Service** — country news for the AI Content Explorer using **GNews (primary) → Currents (fallback) → LLM summarization → Redis (4h TTL)**.

## Goal

Add a backend news layer that powers the AI Content Explorer’s **Current Events** insight and **Trending in {Country}** carousel with real headlines — curated into family-friendly summaries by the existing LLM stack.

**Do not** expose raw news provider responses or API keys to the mobile app. The app consumes a normalized, cached payload only.

---

## Prerequisites (all required)

- `01-country-data-service.md` completed — `Country.cca2` available on country objects
- **`02-local-redis-setup.md` completed** — Redis running and verified
- `04-ai-content-service.md` completed — `lib/llm.ts`, `createStructuredChatCompletion`, OpenAI env vars
- `09-backend-security.md` completed (or in progress) — validation + rate limits on public routes

---

## Architecture

```text
GET /country/:name/explorer
        │
        ▼
explorer.controller.ts
        │
        ▼
news.service.ts  ──► Redis  news:{country}  (TTL 4 hours)
        │
        ├─► GNews API (primary)
        │       └─ on failure / empty / unsupported country
        └─► Currents API (fallback)
                └─ on failure / empty
                    └─► static fallback payload (no LLM)
        │
        ▼
news-ai.service.ts (or section in news.service.ts)
        │
        └─► LLM — summarize headlines → CountryExplorerNews JSON
                └─ on LLM failure → headline-based or static fallback
```

**Mental model:** News providers supply **signals** (headlines). The LLM supplies **product copy** (insight summaries + trending titles). Redis protects provider quotas and keeps responses fast.

---

## Provider chain

### 1. GNews (primary)

- Docs: https://docs.gnews.io/
- Base URL: `https://gnews.io/api/v4`
- Auth: `apikey` query param (server-side only)

**Preferred request — Top Headlines by country**

```http
GET https://gnews.io/api/v4/top-headlines?country={cca2_lower}&lang=en&max=10&apikey={GNEWS_API_KEY}
```

| Param     | Value                                    |
| --------- | ---------------------------------------- |
| `country` | ISO 3166-1 alpha-2 lowercase (e.g. `ng`) |
| `lang`    | `en` (default; widen later if needed)    |
| `max`     | `10`                                     |

**Fallback when country not in GNews supported list** — use Search with country name:

```http
GET https://gnews.io/api/v4/search?q={countryName}+news&lang=en&max=10&apikey={GNEWS_API_KEY}
```

GNews supports many but not all countries. Maintain a small allowlist in code (or derive from a static map) and fall through to search / Currents when `cca2` is unsupported.

**Normalize GNews article shape**

```ts
type RawNewsArticle = {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source?: { name?: string };
};
```

Extract from `response.articles[]`. Drop entries with empty `title`. Cap at 10 items.

**When to try Currents**

- HTTP error (4xx/5xx except 429 — see retry note)
- Empty `articles` array
- Missing / invalid API key
- Country not supported and search also returns empty

Log provider used: `news provider=gnews`, `news provider=currents`, or `news provider=fallback`.

### 2. Currents (fallback)

- Docs: https://currentsapi.services/en/docs/latest_news
- Base URL: `https://api.currentsapi.services/v1`
- Auth: `apiKey` query param (server-side only)

**Preferred request — Latest news by country**

```http
GET https://api.currentsapi.services/v1/latest-news?country={CCA2_UPPER}&language=en&apiKey={CURRENTS_API_KEY}
```

| Param      | Value                                    |
| ---------- | ---------------------------------------- |
| `country`  | ISO 3166-1 alpha-2 uppercase (e.g. `NG`) |
| `language` | `en`                                     |

**Secondary fallback — keyword search**

```http
GET https://api.currentsapi.services/v1/search?keywords={countryName}&language=en&country={CCA2_UPPER}&apiKey={CURRENTS_API_KEY}
```

Normalize from `response.news[]`:

```ts
type RawNewsArticle = {
  title: string;
  description: string | null;
  url: string;
  published: string;
  author?: string;
};
```

### 3. Static fallback (last resort)

When both providers and LLM fail, return a deterministic payload (same tone as `data/ai-explorer-content.ts` generic copy). Endpoint must still return **200**.

---

## LLM summarization

After fetching raw headlines, call the existing LLM helper (`createStructuredChatCompletion`) with a **strict JSON schema**.

**Input to LLM**

- Country name, region, capital (from `getCountryByName`)
- Up to 10 headlines: `{ title, description, source, url, publishedAt }`
- Instruction: family-friendly, educational, no graphic violence, no partisan framing

**Required output shape**

```ts
type CountryExplorerNews = {
  /** Maps to insight card id "events" */
  eventsSummary: string;
  /** 4 items for Trending carousel — short titles, no URLs in title */
  trending: Array<{
    id: string;
    title: string;
    /** Topic slug for image rotation on client, e.g. "tech", "sports", "food", "tourism" */
    topic:
      | "tech"
      | "sports"
      | "food"
      | "tourism"
      | "culture"
      | "economy"
      | "general";
  }>;
  /** Optional source links for "View all" stretch goal */
  sources?: Array<{ title: string; url: string; publishedAt: string }>;
  updatedAt: string; // ISO 8601
};
```

**Prompt guidelines**

- `eventsSummary`: 1–2 sentences, suitable for the “Current Events” insight card
- `trending`: exactly 4 items; each title ≤ 60 chars; engaging but neutral
- Base summaries on supplied headlines — do not invent specific breaking news if headlines are thin
- If headlines are sparse, write evergreen country-relevant trending topics (clearly generic tone)

**LLM failure**

- If LLM throws or returns invalid JSON, build a minimal payload from the first 4 headline titles (trimmed) and a generic `eventsSummary`
- Never fail the HTTP request because of LLM errors

**Cache the LLM output, not raw headlines**

Redis value = final `CountryExplorerNews` object (post-LLM). One cache entry avoids repeat provider + LLM calls for 4 hours.

---

## Redis

Add to `cache.service.ts`:

| Key pattern      | TTL     | Value                      |
| ---------------- | ------- | -------------------------- |
| `news:{country}` | 4 hours | `CountryExplorerNews` JSON |

```ts
// cacheKeys
news: (name: string) => `news:${name.trim().toLowerCase()}`,

// CACHE_TTL
news: 4 * 60 * 60,
```

Use existing `getOrSet(key, CACHE_TTL.news, fetchFn)` pattern.

**Do not** add news to the main feed cache (`feed:countries:*`) — explorer/news is loaded on demand when the user opens AI Content Explorer.

---

## API endpoint

### `GET /country/:name/explorer`

Returns country metadata plus explorer news content for the AI Content Explorer screen.

**Response**

```ts
type CountryExplorerResponse = {
  data: {
    country: Country; // existing enriched shape (images + ai when available)
    explorer: CountryExplorerNews;
  };
};
```

**Behavior**

1. Parse and validate `:name` with existing `parseCountryName`
2. Load country via `getCountryByName` (+ optional image/AI enrichment — same as `GET /country/:name`, or reuse controller helper)
3. Load `explorer` via `getNewsForCountry(country.name, country.cca2)` (cached)
4. Return combined payload

**Performance**

- News fetch + LLM runs only on cache miss
- Target cache miss latency: &lt; 15s (provider timeout 8s each, LLM timeout 12s — align with `lib/llm.ts`)
- Cache hit: &lt; 100ms typical

**Errors**

| Case                 | Status | Notes                                |
| -------------------- | ------ | ------------------------------------ |
| Unknown country      | 404    | Same as country service              |
| Providers + LLM fail | 200    | `explorer` = static fallback         |
| Redis down           | 200    | Serve fresh or fallback; log warning |

---

## Files to add / change

| Path                                             | Purpose                                 |
| ------------------------------------------------ | --------------------------------------- |
| `backend/src/types/news.ts`                      | `RawNewsArticle`, `CountryExplorerNews` |
| `backend/src/lib/gnews.ts`                       | GNews fetch + response validation       |
| `backend/src/lib/currents.ts`                    | Currents fetch + response validation    |
| `backend/src/lib/country-news-providers.ts`      | Provider chain orchestration            |
| `backend/src/services/news.service.ts`           | Cache + LLM summarization + fallbacks   |
| `backend/src/controllers/explorer.controller.ts` | Handler for `/country/:name/explorer    |
| `backend/src/api/country.routes.ts`              | Add `GET /:name/explorer` route         |
| `backend/src/config/env.ts`                      | `GNEWS_API_KEY`, `CURRENTS_API_KEY`     |
| `backend/src/services/cache.service.ts`          | `news` key + TTL                        |
| `backend/.env.example`                           | Document new env vars                   |

Optional (recommended for teachability):

| Path                                | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `backend/src/data/news-fallback.ts` | Static fallback copy per generic country |

Follow patterns from `image.service.ts` (provider chain, logging, graceful degradation) and `ai.service.ts` (LLM + fallback content).

---

## Country code mapping

Use `Country.cca2` from REST Countries (already on country objects).

| Provider | Format    | Example (Nigeria) |
| -------- | --------- | ----------------- |
| GNews    | lowercase | `ng`              |
| Currents | uppercase | `NG`              |

When `cca2` is missing, derive nothing — use country **name** in search queries only.

**Unsupported countries:** If GNews rejects or omits a country, skip to Currents immediately. Document in code comment that coverage varies (GNews ~80 countries; Currents ~120).

---

## Validation

Add parsers in `backend/src/lib/upstream-validation.ts` (or colocated with providers):

- Reject non-object responses
- Require `articles` or `news` array
- Validate each article has non-empty `title` and valid `url` (https only)
- Strip HTML from descriptions
- Cap array length at 10 before LLM call

Never cache malformed upstream JSON.

---

## Security

- `GNEWS_API_KEY` and `CURRENTS_API_KEY` in `backend/.env` only — never in Expo app
- Public route is read-only GET — protected by existing `publicRateLimiter`
- Do not store or return full article bodies; titles + descriptions + URLs only
- LLM prompt must instruct: no medical/legal advice, no graphic content
- Log provider errors without logging API keys

---

## Env vars

Add to `backend/.env.example`:

```env
# News APIs (server-side only — never expose in the Expo app)
GNEWS_API_KEY=
CURRENTS_API_KEY=
```

Both keys optional in dev — without keys, service uses static fallback and logs a warning. At least one key required for acceptance in staging/production.

---

## Client integration (stretch — same PR or follow-up)

Wire `hooks/use-ai-explorer-country.ts` to prefer backend explorer data:

| UI element         | Source                                           |
| ------------------ | ------------------------------------------------ |
| Current Events     | `explorer.eventsSummary`                         |
| Trending titles    | `explorer.trending[].title`                      |
| Trending images    | `country.images[]` rotated by `trending[].topic` |
| “Updated just now” | `explorer.updatedAt` (relative time on client)   |

Add `fetchCountryExplorer(name)` to `lib/api.ts`. On failure, keep existing `getExplorerContent(country)` mock fallback from `data/ai-explorer-content.ts`.

---

## Out of scope

- GDELT integration (separate future prompt if needed)
- Storing news in a database
- Pre-generation cron for all countries (`10-pregeneration-system.md` may call news later)
- Full “View all” article list screen (optional; `sources[]` enables it later)
- News on main TikTok feed (`GET /feed/countries`) — explorer only for v1
- Image URLs from news articles (use existing Unsplash/Pexels `country.images`)

---

## Acceptance criteria

- [ ] `GET /country/nigeria/explorer` returns `200` with `data.explorer.eventsSummary` and 4 `trending` items
- [ ] Second request within 4 hours logs Redis `Cache hit` for `news:nigeria` (no duplicate GNews/Currents call)
- [ ] With `GNEWS_API_KEY` set, primary fetch uses GNews; logs show provider name
- [ ] With GNews disabled/failing and `CURRENTS_API_KEY` set, Currents fallback succeeds
- [ ] With both keys missing or both providers failing, endpoint returns `200` with static fallback explorer payload
- [ ] LLM output is family-friendly JSON matching `CountryExplorerNews` schema
- [ ] Invalid LLM response does not crash the server
- [ ] No news API keys in the Expo app or committed `.env`
- [ ] `npm run typecheck` passes in `backend/`

---

## Testing

```bash
# Terminal 1 — Redis + backend
docker compose up -d redis
cd backend && npm run dev

# Terminal 2 — manual checks
curl -s "http://localhost:3001/country/Nigeria/explorer" | jq '.data.explorer'

# Repeat — expect Cache hit in backend logs, same updatedAt
curl -s "http://localhost:3001/country/Nigeria/explorer" | jq '.data.explorer.updatedAt'
```

**Scenarios**

1. **Happy path** — GNews returns articles → LLM summarizes → cached 4h
2. **GNews down** — unset or invalid GNews key → Currents used
3. **Both down** — static fallback, still 200
4. **Unsupported country** — e.g. small nation → search query or fallback; no 500
5. **Rate limit** — if provider returns 429, log warning, try next provider once

**Mobile**

1. Open AI Content Explorer for Nigeria — Current Events + Trending reflect API data when backend keys configured
2. Stop backend — screen still renders via client mock fallback

---

## Free tier notes (teaching)

| Provider | Free tier (typical) | Implication                                       |
| -------- | ------------------- | ------------------------------------------------- |
| GNews    | ~100 requests/day   | 4h cache essential; do not prefetch all countries |
| Currents | ~600 requests/hour  | Adequate fallback with caching                    |

Design for **on-demand** fetch per country when user opens explorer, not bulk refresh.

---

## Next steps

After this prompt:

1. Wire mobile `use-ai-explorer-country` to `GET /country/:name/explorer`
2. Optional: `POST /internal/news/refresh` with `INTERNAL_API_KEY` to bust cache for a country
3. Optional: extend `10-pregeneration-system.md` to warm cache for top N countries
4. Future: GDELT or Event Registry as a third signal source for ranking headlines before LLM
