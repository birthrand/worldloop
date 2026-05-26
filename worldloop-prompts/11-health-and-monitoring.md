Read AGENTS.md first and follow it strictly.

Reference: `prompts-worldloop/00-backend-overview.md`

Implement **Feature 11: Health & Monitoring** for the WorldLoop backend.

## Goal

Ensure uptime visibility and basic operational logging.

## Prerequisites (all required)

- `01-country-data-service.md` completed
- **`02-local-redis-setup.md` completed** — Redis running and verified

## Scope

- `GET /health` — returns `{ status: "ok", redis: "connected" | "disconnected", uptime: number }`
- Structured logger in `utils/logger.ts` (info, warn, error)
- Log external API failures and cache hit/miss in development
- Optional: simple request logging middleware (method, path, status, duration)

## Out of scope

- Datadog / Sentry integration (can add later)
- Metrics dashboards

## Acceptance criteria

- `GET /health` returns 200 when server is up
- With Redis running (from `02`), `redis` field is `"connected"`
- Redis down → health returns 200 but `redis: "disconnected"` (or 503 — document choice)
- Errors in services log with country name / endpoint context
- No sensitive data (API keys, full env) in logs

## Deployment

- Configure platform health check to hit `GET /health`
- Document expected response in `backend/README.md`
- Production must use managed Redis (Render, Upstash, ElastiCache, etc.) — same `REDIS_URL` pattern as local
