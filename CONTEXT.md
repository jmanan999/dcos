# JanSetu — Context & Architecture Reference

> **Read this first in every conversation about JanSetu.**  
> Project was previously called DCOS. All references in code use the new name.  
> Tracking ID prefix changed from `DCOS-` to `JS-`.

---

## Quick orient

| Item | Value |
|---|---|
| **Project name** | **JanSetu** (People's Bridge) — Delhi Grievance Portal |
| Project root | `/Users/manan/dcos/` (git repo stays named `dcos`) |
| Live frontend | https://dcos-ecru.vercel.app (alias: https://dcos-delhi.vercel.app) |
| Live API | https://dcos.onrender.com |
| GitHub | https://github.com/jmanan999/dcos |
| Stack | FastAPI (Python 3.12) + Next.js 15 + Postgres 16 (PostGIS + pgvector) + Redis + Supabase |
| Monorepo | Turborepo + pnpm workspaces |
| Python venv | `apps/api/.venv/` — activate: `source apps/api/.venv/bin/activate` |
| Local infra | `cd infra && docker compose up -d` (Postgres 5432, Redis 6379, MinIO 9000) |
| Run API | `cd apps/api && python main.py` → `http://localhost:8000/docs` |
| Run worker | `arq app.worker.WorkerSettings` |
| Run web | `pnpm --filter web dev` → `http://localhost:3000` |
| Run tests | `cd apps/api && DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" pytest` |

---

## Production accounts (Supabase)

| Email | Password | Role |
|---|---|---|
| `cm@delhi.gov.in` | `Dcos2026Admin!` | cm_cell → `/cm` |
| `admin@mcd.gov.in` | `Dcos2026Admin!` | dept_admin → `/officer` |
| `officer@mcd.gov.in` | `Dcos2026Field!` | field_officer → `/officer` |

---

## Epic status

| Epic | Title | Status |
|---|---|---|
| **1** | Foundation & DX — monorepo, Docker, CI | ✅ Done |
| **2** | Data model, migrations, Delhi seed | ✅ Done |
| **3** | Identity, RBAC, RLS | ✅ Done |
| **4** | Intake & channels (web form, WhatsApp, IVR) | ✅ Done |
| **5** | AI complaint engine (Groq Llama 3.3 70B) | ✅ Done |
| **6** | Routing, assignment, SLA engine | ✅ Done |
| **7** | Officer console & field app | ✅ Done |
| **8** | Citizen transparency & notifications | ✅ Done |
| **9** | GIS command center & analytics | ✅ Done |
| **10** | Hardening, compliance, observability | ✅ Done (core) |
| **FE** | Modern GovTech design system + bilingual (EN/हिं) | ✅ Done |
| **i18n** | Hindi/English auto-translation via Groq | ✅ Done |
| **GIS** | MapLibre ward heatmap (CM + transparency) | ✅ Done |
| **Chatbot** | JanSetu Assistant — FAQ + Groq AI fallback, bilingual | ✅ Done |

---

## Frontend design system (read before any UI work)

1. **Semantic tokens only.** `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`,
   `border-border`, `bg-card`, `bg-success/warning/destructive`. Tokens → `globals.css` → `tailwind.config.ts`.
   Never use `brand-*`, `saffron-*`, `slate-950`, or raw hex.

2. **Build from `@dcos/ui`.** 22 components: Button, Card, StatCard, DataTable, PageHeader, Badge,
   Tabs, Dialog, Alert, EmptyState, Skeleton, Input, Select, Avatar, Toast, etc. Use before writing bespoke markup.

3. **App-shell surfaces** (officer, cm) use `<AppShell>` + `<RouteGuard>` in a `"use client"` layout.
   Public surfaces (marketing, auth, citizen, transparency) use `MarketingHeader` + `Footer`.

4. **Data via SWR hooks** in `lib/hooks.ts`. Token auto-attached by `apiFetch`. Don't hand-roll `useEffect`+`fetch`.

5. **Auth**: `useAuth()` from `lib/auth/provider`. Real Supabase ES256 when configured, local-JWT HS256 fallback otherwise.
   Token mirrored to `localStorage.dcos_token` on every auth state change.

6. **i18n**: `useLanguage()` from `lib/i18n.tsx` + auto-generated `lib/translations.generated.ts` (138 strings).
   `LanguageProvider` wraps marketing/citizen/auth/transparency layouts. **Landing page + footer must be
   `"use client"` to react to the toggle** — server components can't read language context.
   To add new strings: add to `translate.mjs` → run `GROQ_API_KEY=... node apps/web/scripts/translate.mjs`.

7. **GIS map**: `components/GisMap.tsx` — MapLibre GL client component, CARTO basemaps (no API key),
   circle-per-ward colored by severity. Used in `/cm/map` and `/transparency/map`.

8. **Routes**:
   - `/` → landing (marketing)
   - `/file` → 3-step complaint form
   - `/track` → lookup; `/track/[id]` → timeline
   - `/transparency` → public dashboard
   - `/officer` → officer console (AppShell)
   - `/cm` → command center (AppShell)

---

## Directory map

```
jansetu/ (git: dcos/)
├── apps/
│   ├── api/                        FastAPI modular monolith
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── config.py       All env vars (Pydantic Settings)
│   │   │   │   ├── auth.py         JWT decode: ES256 via JWKS (Supabase) + HS256 local
│   │   │   │   ├── permissions.py  Role → frozenset[permission] matrix
│   │   │   │   ├── dependencies.py FastAPI deps: CurrentUser, RlsDbSession, require_permission()
│   │   │   │   ├── database.py     SQLAlchemy async engine, Base, get_db()
│   │   │   │   ├── logging.py      structlog JSON setup
│   │   │   │   ├── middleware.py   RequestIDMiddleware + SecurityHeadersMiddleware + RateLimitMiddleware
│   │   │   │   ├── notifications.py Idempotent WhatsApp/SMS/push dispatcher + bilingual templates
│   │   │   │   └── telemetry.py    OTel + Sentry wiring
│   │   │   ├── main.py             App factory, lifespan, /healthz /readyz
│   │   │   └── modules/
│   │   │       ├── identity/       Auth, users, departments, officers, phone-claim
│   │   │       ├── intake/         Grievance intake; tracking ID format: JS-YYYYMMDD-XXXXXXXX
│   │   │       ├── ai/             Groq Llama 3.3 70B classify+severity+embed+spam; feedback loop
│   │   │       ├── routing/        dept/officer assignment, load balancing
│   │   │       ├── sla/            SLA clocks + escalation ladder (4 levels)
│   │   │       ├── workforce/      Officer queue, claim, resolve, geo-proof gate, notes, handoff
│   │   │       ├── citizen/        CSAT, reopen, public stats, notification dispatch
│   │   │       ├── analytics/      KPIs, hotspots, leaderboard, trend, NL→SQL (Groq), exec brief
│   │   │       │                   Reads from mv_ward_stats, mv_dept_stats, mv_grievances_daily
│   │   │       ├── reporting/      CSV exports (grievances, dept scorecard, ward stats)
│   │   │       ├── integration/    Dept adapter framework (BaseAdapter + RestAdapter)
│   │   │       └── platform/       OutboxEvent, AuditLog, IdempotencyKey, District, Zone, Ward
│   │   ├── app/worker.py           Arq: enrich_grievance, assign_grievance, check_sla_breaches,
│   │   │                           refresh_analytics_views (every 15min), notify_citizen, relay_outbox
│   │   ├── migrations/versions/    0001→0005 (schema, RLS, AI tables, officer_notes, analytics views)
│   │   ├── scripts/seed.py         11 districts, 12 zones, 272 wards, 12 depts, 540 grievances
│   │   ├── tests/                  70 tests — health, auth (anti-escalation), RLS, intake, workforce
│   │   └── Dockerfile              Multi-stage; CMD uses $PORT env var (Render compatible)
│   └── web/                        Next.js 15, "JanSetu" brand, Modern GovTech design system
│       └── src/
│           ├── app/
│           │   ├── layout.tsx          Root: Inter + Providers (Auth + Toast + Language)
│           │   ├── globals.css         Semantic HSL tokens
│           │   ├── (marketing)/        / → landing ("use client" for i18n)
│           │   ├── (auth)/             /login, /signup — LanguageProvider wrapped
│           │   ├── (citizen)/          /file, /track, /my-complaints — LanguageProvider wrapped
│           │   ├── (transparency)/     /transparency, /departments, /map
│           │   ├── (officer)/          "use client" layout + AppShell + RouteGuard
│           │   └── (cm)/               "use client" layout + AppShell + RouteGuard
│           ├── middleware.ts           Supabase route protection (/officer, /cm, /my-complaints)
│           ├── components/
│           │   ├── GisMap.tsx          MapLibre GL heatmap — CARTO dark/light, circle-per-ward
│           │   ├── providers.tsx       AuthProvider + ToastProvider
│           │   ├── route-guard.tsx     Client role-gate (localStorage token)
│           │   └── shell/              AppShell, Sidebar, Topbar, MobileNav,
│           │                           MarketingHeader ("use client"), Footer ("use client")
│           ├── scripts/translate.mjs   Auto-translate via Groq: run to regenerate Hindi strings
│           └── components/chatbot/  chat-bot.tsx — floating widget, client FAQ + API fallback
│           └── lib/
│               ├── api.ts              apiFetch + swrFetcher (auto-attaches dcos_token)
│               ├── hooks.ts            useKpis, useHotspots, useLeaderboard, useTrend,
│               │                       usePublicStats, useQueue
│               ├── i18n.tsx            LanguageProvider + useLanguage() hook
│               ├── translations.generated.ts  138 EN/HI string pairs (auto-generated)
│               ├── auth/               config (isSupabaseConfigured), types, provider
│               └── supabase/           client.ts (browser), server.ts (SSR)
├── packages/
│   ├── ui/src/                     @dcos/ui — 22 design-system components (Radix-backed)
│   └── types/src/index.ts          Shared TS: GrievanceStatus, Channel, Priority, etc.
├── infra/
│   └── docker-compose.yml          Postgres 16+PostGIS+pgvector, Redis 7, MinIO
├── vercel.json                     Monorepo config: rootDirectory=apps/web (set via API)
├── render.env.example              Template for Render env vars
└── .github/workflows/ci.yml        api-lint → api-test → web-lint → web-build → docker-build
```

---

## Key architecture rules

1. **No cross-module table imports.** Call `B.service`, never `B.models` from another module.
2. **Transactional outbox.** Every state change writes an `OutboxEvent` in the same transaction.
3. **Status state machine** in `GrievanceStatus.allowed_transitions()`. Never set `.status` directly.
4. **Alembic migrations forward-only.** Never edit a shipped migration.
5. **Feature flags** in `config.py`: `FEATURE_AI_CLASSIFY`, `FEATURE_WHATSAPP_INTAKE`, `FEATURE_ANALYTICS_NL_QUERY`.
6. **RLS**: use `RlsDbSession` for scoped reads. Workers bypass via `set_config('app.bypass_rls','true',true)`.
7. **Tracking IDs**: `JS-YYYYMMDD-XXXXXXXX` (8-char hex suffix). Changed from `DCOS-` in Jun 2026.
9. **Chatbot**: `FEATURE_CHATBOT=true` (default). FAQ matching is client-side (instant). Non-FAQ → Groq. Feature flag disables the `/chatbot/ask` endpoint.
8. **AI provider**: Groq (`llama-3.3-70b-versatile`) primary; OpenRouter + Gemini as fallbacks.
   Set via `AI_PROVIDER` env var. `_make_tracking_id()` in `intake/service.py`.

---

## Auth & permissions

**Roles:** `citizen` | `field_officer` | `dept_admin` | `district_officer` | `cm_cell` | `super_admin`

**JWT flow:**
- Supabase project `nggbydarhctzacxzivyw` (ap-southeast-1) — **ES256** via JWKS, cached 1h.
- App role comes from **`app_metadata.dcos_role`** (admin-only). `user_metadata` is IGNORED for roles
  (prevents privilege escalation — anti-escalation test in `test_auth.py`).
- Local dev: HS256 via `JWT_SECRET`, issued by `POST /api/v1/identity/token` (disabled in production).
- Frontend: token mirrored to `localStorage.dcos_token` via `onAuthStateChange`.

**Supabase pooler** (production DB connection):
- Host: `aws-1-ap-southeast-1.pooler.supabase.com` (note: `aws-1`, not `aws-0`)
- Port: **5432** (session mode — supports prepared statements with asyncpg)
- Transaction mode (6543) does NOT work with asyncpg prepared statements.

---

## DB schema — key tables

| Table | Notes |
|---|---|
| `grievances` | Core table. `embedding vector(768)`, `location geography(POINT)`. HNSW + GiST + GIN indexes. |
| `status_events` | Append-only audit log. Source of truth for timeline + accountability. |
| `outbox_events` | Transactional outbox. SKIP LOCKED relay. Processed by Arq worker. |
| `mv_ward_stats` | Materialized view. Ward-level open/total/sla counts. Refreshed every 15min by worker. |
| `mv_dept_stats` | Materialized view. Dept resolution rate, CSAT, reopen rate. |
| `mv_grievances_daily` | Materialized view. Daily rollup by dept × category. |
| `notification_preferences` | Per-user channel opt-in/out (Epic 8). |
| `feedback` | CSAT 1–5 after closure. |
| `escalation_records` | Every auto-escalation step (4 levels). |

---

## Epics 8–10 + extras reference

**Epic 8 (citizen):** CSAT, reopen, WhatsApp/SMS (no-ops without keys), public-stats endpoint.

**Epic 9 (analytics):** Materialized views, KPI endpoint, hotspots, leaderboard, NL→SQL (Groq),
executive brief (text), CSV exports. `refresh_analytics_views()` PG function called by worker cron.
**GIS heatmap:** `components/GisMap.tsx` — MapLibre GL, CARTO basemaps, circle-per-ward.

**Epic 10 (hardening):** SecurityHeadersMiddleware, RateLimitMiddleware (skipped in `local` env),
IntegrationService + RestAdapter framework. RLS defense-in-depth on all scoped tables.

**i18n (Jun 2026):** `LanguageProvider` + `useLanguage()`. 138 strings EN/HI.
Script: `GROQ_API_KEY=... node apps/web/scripts/translate.mjs` to regenerate.
Layouts that need translation must be `"use client"` — server components can't read context.

**Rebrand (Jun 2026):** DCOS → JanSetu. Tracking IDs: `DCOS-` → `JS-`.

---

## SQL gotchas with SQLAlchemy text() + asyncpg

| Pattern | Problem | Fix |
|---|---|---|
| `:name::type` | SQLAlchemy parser doesn't replace `:name` before `::type` | Use `CAST(:name AS type)` |
| `::vector` | Same + asyncpg binary codec | `CAST(:emb AS vector)` |
| `::uuid` | Same | `CAST(:id AS uuid)` |
| `NULL` param type | asyncpg can't infer type of `$N` when value is None | Split into two queries |
| Param in CASE + SET | asyncpg infers different types (varchar vs text) | Compute in Python, use simple `:status` |

---

## Local dev quick-start

```bash
# Boot infra
cd infra && docker compose up -d

# API
cd apps/api && source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" alembic upgrade head
DATABASE_URL="postgresql://dcos:dcos@localhost:5432/dcos" python -m scripts.seed
python main.py                        # → http://localhost:8000/docs

# Worker (AI + notifications + analytics refresh)
arq app.worker.WorkerSettings

# Frontend
cd ../.. && pnpm --filter web dev     # → http://localhost:3000
```

**Dashboards empty?** Docker stopped. `docker compose up -d` → restart API.

**Prod DB migrations:**
```bash
DATABASE_URL="postgresql://postgres.nggbydarhctzacxzivyw:PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  alembic upgrade head
```
