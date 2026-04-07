# Public Web Parser / Crawler — NestJS + TypeScript

## Tech Stack Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Framework | NestJS | Requested substitute for Express; DI, modules, lifecycle hooks |
| Parsing | HTTP (axios) → Playwright fallback | Cheap first attempt; escalate to headless browser only if JS-rendered |
| Queue | BullMQ + Redis | Persistent jobs, retry strategies, concurrency control built-in |
| DB | PostgreSQL + TypeORM | Type-safe migrations, decorators, active record / repository pattern |
| Logs | Pino (via nestjs-pino) | Structured JSON, low overhead |
| Tests | Jest + Supertest | Standard NestJS test stack |

---

## Folder Structure

```
onlyk/
├── plan.md                          # This file
├── docker-compose.yml               # PostgreSQL + Redis services
├── .env.example                     # Environment variable template
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.ts
├── package.json
│
├── src/
│   ├── main.ts                      # Bootstrap, graceful shutdown (SIGTERM)
│   ├── app.module.ts                # Root module wiring
│   │
│   ├── config/
│   │   └── configuration.ts         # Typed env config via @nestjs/config
│   │
│   ├── database/
│   │   ├── database.module.ts       # TypeORM module setup, connection config
│   │   └── entities/
│   │       ├── job.entity.ts        # Job table: id, status, priority, total, timestamps
│   │       ├── job-url.entity.ts    # JobUrl table: id, jobId, url, status, error, profileId
│   │       └── profile.entity.ts   # Profile table: all scraped fields + checksum, scraped_at
│   │
│   ├── crawler/                     # POST /crawl — job creation
│   │   ├── crawler.module.ts
│   │   ├── crawler.controller.ts    # POST /crawl endpoint
│   │   ├── crawler.service.ts       # Creates Job + JobUrl rows, enqueues BullMQ tasks
│   │   └── dto/
│   │       └── crawl-request.dto.ts # { urls[], priority }
│   │
│   ├── jobs/                        # GET /jobs/:jobId — job status
│   │   ├── jobs.module.ts
│   │   ├── jobs.controller.ts       # GET /jobs/:jobId
│   │   ├── jobs.service.ts          # Reads Job + JobUrl from DB, computes status
│   │   └── dto/
│   │       └── job-status.dto.ts    # { jobId, status, total, processed, failed, results[] }
│   │
│   ├── profiles/                    # GET /profiles?query= — search
│   │   ├── profiles.module.ts
│   │   ├── profiles.controller.ts   # GET /profiles with pagination
│   │   ├── profiles.service.ts      # TypeORM ilike search + pagination
│   │   └── dto/
│   │       ├── profile-query.dto.ts # { query, page, limit }
│   │       └── profile.dto.ts       # Outbound profile shape
│   │
│   ├── queue/                       # BullMQ wiring
│   │   ├── queue.module.ts          # Registers BullMQ queues + Redis connection
│   │   ├── queue.constants.ts       # CRAWL_QUEUE name, job name constants
│   │   └── crawl.processor.ts       # @Processor — concurrency, rate-limit, retry logic
│   │                                #   pulls HTTP/Playwright strategy, updates DB
│   │
│   ├── scraper/                     # Parsing strategies (no HTTP calls in tests)
│   │   ├── scraper.module.ts
│   │   ├── scraper.service.ts       # Orchestrates: try HTTP → try Playwright → blocked
│   │   ├── strategies/
│   │   │   ├── http.strategy.ts     # axios fetch + Cheerio parse; returns raw HTML
│   │   │   └── playwright.strategy.ts # Playwright launch, wait for networkidle
│   │   ├── parsers/
│   │   │   └── onlyfans.parser.ts   # Cheerio/DOM → ScrapedProfileDto (null-safe)
│   │   └── dto/
│   │       └── scraped-profile.dto.ts  # Internal DTO: all optional fields + checksum
│   │
│   ├── metrics/
│   │   ├── metrics.module.ts
│   │   └── metrics.service.ts       # In-memory counters: scraped, blocked, errors
│   │                                # GET /health exposes these
│   │
│   └── common/
│       ├── filters/
│       │   └── all-exceptions.filter.ts  # Global error → structured log
│       ├── interceptors/
│       │   └── logging.interceptor.ts    # Request/response timing
│       └── utils/
│           ├── checksum.ts          # SHA256 of raw HTML → hex string
│           └── backoff.ts           # Exponential backoff with jitter helper
│
└── test/
    ├── unit/
    │   └── onlyfans.parser.spec.ts  # HTML fixture → DTO assertions (pure, no I/O)
    ├── integration/
    │   └── job-flow.spec.ts         # Mocked queue + HTTP, full job lifecycle
    └── e2e/
        └── crawl.e2e-spec.ts        # POST /crawl → GET /jobs/:id, Supertest
```

---

## Module Descriptions

### `database/`
TypeORM module with `forRootAsync` reading `DATABASE_URL` from config. Three entities:
- **`Job`** — `id` (uuid), `status` (enum), `priority`, `total`, `createdAt`, `updatedAt`
- **`JobUrl`** — `id`, `jobId` (FK), `url`, `status` (queued/ok/error/blocked), `error`, `profileId` (nullable FK)
- **`Profile`** — all scraped fields (`source_url` unique index), `raw_html_checksum`, `scraped_at`

Migrations generated via TypeORM CLI (`npm run migration:generate`, `migration:run`).

### `crawler/`
`POST /crawl`: validates DTO, generates UUID job, inserts `Job` + one `JobUrl` per URL (deduplicates within the request), enqueues BullMQ tasks. Returns `{ jobId, queued }` immediately (non-blocking).

### `jobs/`
`GET /jobs/:jobId`: loads `Job` + all child `JobUrl` rows via TypeORM repository. Counts `processed` (ok+blocked) and `failed` (error). Derives `status`: if any URL still `queued` or `running` → `running`; all done → `done`/`failed`/`partial`.

### `profiles/`
`GET /profiles?query=&page=&limit=`: TypeORM `findAndCount` with `ILIKE` on `username`, `display_name`, `bio`. Returns `{ total, page, limit, data[] }`.

### `queue/`
`queue.module.ts` registers `CRAWL_QUEUE` with BullMQ + Redis. `crawl.processor.ts`:
- Concurrency: 3–5 workers (configurable via env)
- Per-domain rate limit: 1 req/s via BullMQ rate limiter
- Retry: up to 3 attempts, exponential backoff for 429/5xx
- 403/anti-bot: no retry, mark `JobUrl.status = blocked`, record reason

### `scraper/`
**Strategy ladder:**
1. `HttpStrategy` — axios GET with browser-like headers + Cheerio parse. If 200 and meaningful data extracted → done.
2. `PlaywrightStrategy` — headless Chromium, waits for `networkidle`. Used when HTTP returns a JS-shell page or empty parse result.
3. `blocked` — 403, Cloudflare challenge, or CAPTCHA detected → mark blocked, stop.

`onlyfans.parser.ts` extracts all required fields null-safely. Computes `raw_html_checksum` (SHA256). If checksum matches existing `Profile` row → skip DB update (cache hit).

### `metrics/`
Singleton service with atomic in-memory counters (`scraped`, `blocked`, `errors`). Incremented by the processor. Exposed via `GET /health` response: `{ status: "ok", metrics: { ... } }`.

### `common/`
- `checksum.ts` — pure function, SHA256 of string → hex.
- `backoff.ts` — `sleep(baseMs * 2^attempt + jitter)`.
- Global exception filter: converts unhandled errors to structured Pino log.
- Logging interceptor: logs method, path, status, duration on every request.

### `test/`
- **Unit** (`onlyfans.parser.spec.ts`) — loads static HTML fixture, runs parser, asserts every DTO field (including null fields for blocked data).
- **Integration** (`job-flow.spec.ts`) — mocks BullMQ and HTTP strategy; verifies job status transitions: `queued → running → done/partial`.
- **E2E** (`crawl.e2e-spec.ts`) — full NestJS app with test DB; `POST /crawl` → poll `GET /jobs/:id` → assert final status and profile presence.

---

## Environment Variables (`.env.example`)

```
DATABASE_URL=postgresql://user:pass@localhost:5432/crawler
REDIS_URL=redis://localhost:6379
CRAWLER_CONCURRENCY=3
CRAWLER_RATE_LIMIT_PER_DOMAIN=1
CRAWLER_TIMEOUT_MS=15000
PLAYWRIGHT_ENABLED=true
LOG_LEVEL=info
PORT=3000
```

---

## docker-compose.yml services

- `postgres` — image `postgres:16-alpine`, port 5432
- `redis` — image `redis:7-alpine`, port 6379
- `app` — builds from `Dockerfile`, depends on both, mounts `.env`
