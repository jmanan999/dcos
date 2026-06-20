# DCOS — Context & Architecture Reference

> **Read this first in every conversation about DCOS.**  
> It tells you exactly which files to read for any task, what's built, and what's next.  
> Keep it updated as epics complete.

---

## Quick orient

| Item | Value |
|---|---|
| Project root | `/Users/manan/dcos/` |
| Stack | FastAPI (Python 3.12) + Next.js 15 + Postgres 16 (PostGIS + pgvector) + Redis + Supabase |
| Monorepo | Turborepo + pnpm workspaces |
| Python venv | `apps/api/.venv/` — activate: `source apps/api/.venv/bin/activate` |
| Local infra | `cd infra && docker compose up -d` (Postgres 5432, Redis 6379, MinIO 9000) |
| Run API | `cd apps/api && python main.py` → `http://localhost:8000/docs` |
| Run web | `pnpm --filter web dev` → `http://localhost:3000` |
| Run tests | `cd apps/api && DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" pytest` |

---

## Epic status

| Epic | Title | Status |
|---|---|---|
| **1** | Foundation & DX — monorepo, Docker, skeletons, CI | ✅ Done |
| **2** | Data model, migrations, Delhi seed | ✅ Done |
| **3** | Identity, RBAC, RLS | ✅ Done |
| **4** | Intake & channels (web form, WhatsApp, IVR) | ✅ Done |
| **5** | AI complaint engine (classify, severity, dedup, worker) | ✅ Done |
| **6** | Routing, assignment, SLA engine | ✅ Done |
| **7** | Officer console & field app | ✅ Done |
| **8** | Citizen transparency & notifications | ✅ Done |
| **9** | GIS command center & analytics | ✅ Done |
| **10** | Hardening, compliance, observability, launch | ✅ Done (core) |
| **FE** | Frontend overhaul — Modern GovTech design system, auth, modular routes | ✅ Done |

---

## Frontend design system (read before any UI work)

The web app was rebuilt into a cohesive **Modern GovTech** design system. Rules:

1. **Use semantic tokens, never raw colors.** `bg-background`, `text-foreground`, `bg-primary`,
   `text-muted-foreground`, `border-border`, `bg-card`, `bg-success/warning/destructive`, etc.
   Tokens live in `apps/web/src/app/globals.css` (HSL) → mapped in `tailwind.config.ts`.
   Do NOT reintroduce `brand-*`, `saffron-*`, `slate-950`, or ad-hoc hex.
2. **Build from `@dcos/ui`.** Reuse Button, Card, StatCard, DataTable, PageHeader, Badge,
   Tabs, Dialog, Alert, EmptyState, Skeleton, etc. before writing bespoke markup.
3. **App-shell surfaces** (officer, cm) use `<AppShell>` + `<RouteGuard>` in their layout —
   which must be `"use client"` (they pass lucide icon components to a client shell).
   Public surfaces (marketing, auth, citizen, transparency) use `MarketingHeader`+`Footer`.
4. **Data via SWR hooks** in `lib/hooks.ts` (token auto-attached by `apiFetch`). Don't hand-roll
   `useEffect`+`fetch`.
5. **Auth**: `useAuth()` from `lib/auth/provider`. Real Supabase when configured, else local-JWT
   fallback (`POST /identity/token`). Citizens → phone OTP, officers → email/password.
   `isSupabaseConfigured()` decides. Paste real keys into `apps/web/.env.local` to go live.
6. **Routes restructured**: `/` is now the landing page; the file form moved to `/file`;
   `/public` → `/transparency`; `/officer/admin` → `/officer/team`.

---

## Directory map — where things live

```
dcos/
├── apps/
│   ├── api/                        FastAPI modular monolith
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── config.py       All env vars (Pydantic Settings)
│   │   │   │   ├── auth.py         JWT decode/encode, TokenClaims, Supabase compat
│   │   │   │   ├── permissions.py  Role → frozenset[permission] matrix
│   │   │   │   ├── dependencies.py FastAPI deps: CurrentUser, RlsDbSession, require_permission()
│   │   │   │   ├── database.py     SQLAlchemy async engine, Base, get_db()
│   │   │   │   ├── logging.py      structlog JSON setup
│   │   │   │   ├── middleware.py   Pure-ASGI request-ID middleware (NOT BaseHTTPMiddleware)
│   │   │   │   └── telemetry.py    OTel + Sentry wiring
│   │   │   ├── main.py             App factory, lifespan, health endpoints /healthz /readyz
│   │   │   └── modules/
│   │   │       ├── identity/       Auth, users, departments, officers, phone-claim
│   │   │       │   ├── models.py   User, Department, Officer
│   │   │       │   ├── schemas.py  UserRead, OfficerRead, TokenRequest/Response, ...
│   │   │       │   ├── service.py  IdentityService (upsert_me, list_officers, claim_phone)
│   │   │       │   ├── repository.py UserRepository, DepartmentRepository, OfficerRepository
│   │   │       │   └── router.py   /identity/* — /me, /token, /departments, /officers
│   │   │       ├── intake/         Grievance intake, attachments, clusters, status events
│   │   │       │   ├── models.py   Grievance, GrievanceCluster, StatusEvent, Attachment
│   │   │       │   │               GrievanceStatus enum + allowed_transitions()
│   │   │       │   ├── schemas.py  GrievanceCreate, GrievanceRead, TrackingResponse
│   │   │       │   ├── service.py  IntakeService (create_grievance, get_tracking, add_attachment)
│   │   │       │   ├── repository.py GrievanceRepository, ClusterRepository
│   │   │       │   └── router.py   POST /intake/grievances, GET /intake/track/{id},
│   │   │       │                   POST /intake/grievances/{id}/attachments,
│   │   │       │                   GET+POST /intake/webhooks/whatsapp
│   │   │       ├── ai/             Gemini classify+severity+embed+spam; mock mode; feedback loop
│   │   │       │   ├── models.py   AIResult (audit), FeedbackLabel (labeled data)
│   │   │       │   ├── schemas.py  ClassificationResult, SeverityScore, AIEnrichmentResult
│   │   │       │   ├── service.py  AIService.enrich() + _detect_cluster() + record_correction()
│   │   │       │   └── router.py   POST /ai/enrich/{id}, POST /ai/feedback
│   │   │       ├── routing/        dept/officer assignment with load balancing
│   │   │       │   ├── schemas.py  AssignmentResult
│   │   │       │   ├── service.py  RoutingService.assign() / reassign()
│   │   │       │   └── router.py   POST /routing/assign/{id}, POST /routing/reassign/{id}
│   │   │       ├── sla/            SLA clocks + escalation ladder
│   │   │       │   ├── models.py   SLAPolicy, EscalationRecord
│   │   │       │   ├── schemas.py  SLAStatus, EscalationEvent
│   │   │       │   ├── service.py  SLAService.compute_sla() + check_and_escalate()
│   │   │       │   └── router.py   GET /sla/status/{id}, POST /sla/check-breaches
│   │   │       ├── workforce/      Officer queue, claim, resolve, proof gate, notes, handoff
│   │   │       │   ├── models.py   AssignmentHistory, OfficerNote
│   │   │       │   ├── schemas.py  GrievanceSummary, ProofVerificationResult, WorkloadSummary
│   │   │       │   ├── service.py  WorkforceService (get_queue, claim, resolve, add_note,
│   │   │       │   │               mark_action_taken, request_info, verify_proof, get_workload)
│   │   │       │   └── router.py   GET /workforce/queue, /dept-queue, /workload
│   │   │       │                   POST /workforce/grievances/{id}/claim|action-taken|resolve|notes
│   │   │       ├── citizen/        CSAT, reopen, public stats, notification dispatch
│   │   │       │   ├── models.py   Feedback, Notification
│   │   │       │   ├── schemas.py  FeedbackCreate, ReopenRequest, PublicKPISnapshot
│   │   │       │   ├── service.py  CitizenService (submit_feedback, reopen, get_public_stats,
│   │   │       │   │               notify_status_change)
│   │   │       │   └── router.py   POST /citizen/feedback/{id}, POST /citizen/reopen/{id},
│   │   │       │                   GET /citizen/public-stats
│   │   │       ├── analytics/      KPIs, hotspots, leaderboard, trend, NL→SQL, executive brief
│   │   │       │   ├── schemas.py  KPISnapshot, WardHotspot, DeptLeaderboardRow, NLQueryRequest
│   │   │       │   ├── service.py  AnalyticsService (get_kpis, get_hotspots, get_dept_leaderboard,
│   │   │       │   │               get_trend, nl_query, get_executive_brief, refresh_views)
│   │   │       │   └── router.py   GET /analytics/kpis|hotspots|leaderboard|trend|executive-brief
│   │   │       │                   POST /analytics/nl-query, POST /analytics/refresh-views
│   │   │       ├── reporting/      CSV export — grievances, dept scorecard, ward stats
│   │   │       │   ├── schemas.py  CSVExportParams, ReportResponse
│   │   │       │   ├── service.py  ReportingService (export_csv, dept_scorecard_csv, ward_stats_csv)
│   │   │       │   └── router.py   GET /reporting/export/grievances|dept-scorecard|ward-stats
│   │   │       ├── integration/    Dept adapter framework (rest | email | file)
│   │   │       │   ├── schemas.py  AdapterConfig, SyncRecord
│   │   │       │   ├── service.py  IntegrationService + BaseAdapter protocol + RestAdapter
│   │   │       │   └── router.py   GET /integration/adapters, POST /integration/push/{id}
│   │   │       └── platform/       OutboxEvent, AuditLog, IdempotencyKey, District, Zone, Ward
│   │   │           ├── models.py   District, Zone, AssemblyConstituency, Ward, OutboxEvent,
│   │   │           │               AuditLog, IdempotencyKey
│   │   │           └── repository.py OutboxRepository, AuditRepository, GeoRepository
│   │   ├── app/worker.py           Arq worker: enrich_grievance, assign_grievance,
│   │   │                           check_sla_breaches, refresh_analytics_views, notify_citizen,
│   │   │                           relay_outbox
│   │   │   Cron: relay_outbox every 5s, check_sla_breaches every 5min,
│   │   │         refresh_analytics_views every 15min
│   │   │   Start: arq app.worker.WorkerSettings
│   │   ├── app/core/storage.py     Async boto3 upload helper (MinIO/S3/R2)
│   │   ├── migrations/
│   │   │   ├── env.py              Async Alembic env — imports ALL models for autogenerate
│   │   │   └── versions/
│   │   │       ├── 0001_initial_schema.py   All tables, enums, PostGIS/HNSW/GIN indexes,
│   │   │       │                             sync_grievance_location trigger
│   │   │       ├── 0002_rls_policies.py     RLS ENABLE + FORCE + all policies
│   │   │       ├── 0003_ai_tables.py        ai_results + feedback_labels
│   │   │       ├── 0004_officer_notes.py    officer_notes table + dcos_app grant
│   │   │       └── 0005_analytics_views.py  notification_preferences + 3 materialized views
│   │   │                                    (mv_grievances_daily, mv_ward_stats, mv_dept_stats)
│   │   │                                    + refresh_analytics_views() function
│   │   ├── scripts/
│   │   │   └── seed.py             Async asyncpg seed: 11 districts, 12 zones, 272 wards,
│   │   │                           12 departments, 540 grievances, 2680 status events
│   │   ├── tests/
│   │   │   ├── test_health.py      /healthz + all 11 module /health endpoints
│   │   │   ├── test_auth.py        JWT round-trip, Supabase format, permission matrix
│   │   │   └── test_rls.py         App-level 401/403 + DB-level RLS isolation
│   │   ├── pyproject.toml          All deps + ruff/mypy/pytest config
│   │   ├── alembic.ini
│   │   ├── main.py                 uvicorn entrypoint
│   │   └── Dockerfile
│   │   ├── app/core/notifications.py  Idempotent WhatsApp/SMS/push dispatcher
│   │   │                              + status_change_message() bilingual templates
│   └── web/                        Next.js 15 — Modern GovTech design system (see UI note below)
│       └── src/
│           ├── app/
│           │   ├── layout.tsx          Root: Inter font + <Providers> (Auth + Toast)
│           │   ├── globals.css         Semantic HSL design tokens (light, indigo)
│           │   ├── (marketing)/        / → landing (hero, live stats, how-it-works, CTA)
│           │   ├── (auth)/             /login (citizen OTP | officer email tabs), /signup
│           │   │                       split-screen layout w/ dark brand panel
│           │   ├── (citizen)/          /file (3-step stepper form), /track, /track/[id],
│           │   │                       /track/[id]/feedback|reopen, /my-complaints
│           │   ├── (transparency)/     /transparency (recharts), /departments, /map
│           │   ├── (officer)/          AppShell+RouteGuard: /officer, /queue (DataTable),
│           │   │                       /grievance/[id] (tabs: notes/proof/resolve), /team
│           │   └── (cm)/               AppShell+RouteGuard: /cm, /map, /hotspots,
│           │                           /departments, /analytics (NL copilot), /reports
│           ├── middleware.ts           Supabase route protection (/officer,/cm,/my-complaints)
│           ├── components/
│           │   ├── providers.tsx       AuthProvider + ToastProvider
│           │   ├── route-guard.tsx     Client role-gate (works w/ local-JWT fallback)
│           │   ├── shell/              AppShell, Sidebar, Topbar, MobileNav, MarketingHeader,
│           │   │                       Footer, nav-config (lucide icons per surface)
│           │   └── marketing/          LiveStats island
│           └── lib/
│               ├── api.ts              apiFetch (auto-attaches token) + swrFetcher
│               ├── hooks.ts            SWR: useKpis, useHotspots, useLeaderboard, useTrend,
│               │                       usePublicStats, useQueue
│               ├── auth/               config (isSupabaseConfigured), types (Role, homeForRole),
│               │                       provider (AuthProvider/useAuth + local-JWT fallback)
│               └── supabase/           client.ts (browser), server.ts (SSR)
├── packages/
│   ├── ui/src/                     Design-system kit (~22 components, all token-based):
│   │                              Button, Badge/Severity/Status, Card, Input, Label, Textarea,
│   │                              Select, Tabs, Dialog, DropdownMenu, Toast, Avatar, Skeleton,
│   │                              Separator, Alert, Progress, EmptyState, StatCard, PageHeader,
│   │                              DataTable, cn. Radix-backed. Consumed via `@dcos/ui`.
│   └── types/src/index.ts          Shared TS types: GrievanceStatus, Channel, Priority,
│                                   GrievanceRead, GrievanceCreate, KPISnapshot, etc.
├── infra/
│   ├── docker-compose.yml          Postgres 16+PostGIS+pgvector, Redis 7, MinIO
│   └── postgres/
│       ├── Dockerfile              postgres:16-bookworm + PostGIS + pgvector (multi-arch)
│       └── init.sql                Extensions (postgis, vector, pg_trgm, uuid-ossp, btree_gin)
└── .github/workflows/ci.yml        api-lint → api-test → web-lint → web-build → docker-build
```

---

## Key architecture rules

1. **No cross-module table imports.** If module A needs data from module B, call `B.service`, never import `B.models`. This is what makes each module extractable later.

2. **Transactional outbox.** Every domain state change should write an `OutboxEvent` in the same DB transaction. Workers (Redis/Arq) relay it async. Use `platform.OutboxRepository.emit()`.

3. **Status state machine is in `GrievanceStatus.allowed_transitions()`.** All status transitions go through `GrievanceRepository.transition_status()` — never set `grievance.status` directly.

4. **Alembic migrations are forward-only.** Never edit a shipped migration. New work = new revision.

5. **Feature flags.** Half-built epics live behind `FEATURE_*` env vars in `app/core/config.py`. Check `settings.FEATURE_AI_CLASSIFY` before calling Gemini.

6. **RLS enforcement.** Use `RlsDbSession` (not `DbSession`) on any endpoint that reads scoped data. `get_rls_db` sets `app.user_id`, `app.user_role`, `app.department_id` session vars that the RLS policies read. The `dcos` superuser bypasses RLS — always use `dcos_app` credentials for RLS-sensitive operations (tests use `dcos_app:dcos_app@localhost:5432/dcos`).

7. **Latitude/Longitude in Grievance.** `latitude`/`longitude` float columns are the write path. A DB trigger (`sync_grievance_location`) auto-populates the PostGIS `geography(POINT)` `location` column. Spatial queries use `ST_DWithin(location, ...)`.

---

## DB schema — key tables

| Table | Owner module | Notes |
|---|---|---|
| `districts` | platform | 11 Delhi districts |
| `zones` | platform | 12 MCD zones |
| `wards` | platform | 272 MCD wards; PostGIS geometry col; centroid_lat/lng |
| `assembly_constituencies` | platform | 70 ACs |
| `departments` | identity | 12 departments (MCD, DJB, PWD, DP, DTC, BSES-R/Y, TPDDL, DPCC, NDMC, DMRC, HEALTH) |
| `users` | identity | citizens + officers + admins; role field |
| `officers` | identity | FK to users + departments |
| `grievances` | intake | core table; `embedding vector(768)`; `location geography(POINT)`; HNSW + GiST + GIN indexes |
| `grievance_clusters` | intake | auto-cluster similar grievances |
| `status_events` | intake | append-only; source of truth for timeline + audit |
| `attachments` | intake | proof photos; `is_proof`, `proof_type` |
| `sla_policies` | sla | dept × category × priority → resolution_hours |
| `escalation_records` | sla | every auto-escalation step |
| `assignment_history` | workforce | every officer assignment |
| `feedback` | citizen | CSAT after closure |
| `notifications` | citizen | WhatsApp/SMS/push log; idempotent |
| `outbox_events` | platform | transactional outbox; SKIP LOCKED relay |
| `audit_log` | platform | append-only; actor + action + old/new values |
| `idempotency_keys` | platform | guard WhatsApp webhooks against replays |

---

## Auth & permissions

**Roles:** `citizen` | `field_officer` | `dept_admin` | `district_officer` | `cm_cell` | `super_admin`

**JWT flow:**
- Supabase project `nggbydarhctzacxzivyw` issues **ES256** JWTs (asymmetric — no shared secret).
  `decode_token()` verifies them against the project JWKS (`/auth/v1/.well-known/jwks.json`,
  cached 1h). Local dev tokens stay **HS256** via `JWT_SECRET`; the token header `alg` picks the path.
- **App role comes from `app_metadata.dcos_role`** (admin/service-key only) — NOT `user_metadata`
  (which is user-editable and would allow self-escalation). `department_id` likewise in app_metadata.
  Provision officers via the Supabase admin API with `app_metadata: { dcos_role, department_id }`.
- `POST /api/v1/identity/token` issues local HS256 JWTs (disabled in production).
- Frontend mirrors the Supabase access token into `localStorage.dcos_token` (kept fresh via
  `onAuthStateChange`) so `apiFetch` sends a valid bearer in both auth modes.

**Permission check:** `require_permission(P.GRIEVANCE_READ_DEPT)` as a FastAPI dependency.  
**Permission matrix:** `app/core/permissions.py` — `ROLE_PERMISSIONS` dict.

**RLS policies** (migration 0002):
- `rls_grievances_bypass` — `app.bypass_rls = 'true'`
- `rls_grievances_admin` — cm_cell / district_officer / super_admin see all
- `rls_grievances_dept` — field_officer / dept_admin see own dept only
- `rls_grievances_citizen` — citizen sees own grievances only (citizen_id match)

---

## Identity endpoints (live)

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/api/v1/identity/token` | none | Issue local JWT (local/staging only) |
| `GET` | `/api/v1/identity/me` | any role | Get/upsert current user row |
| `PATCH` | `/api/v1/identity/me` | any role | Update name / language_pref |
| `GET` | `/api/v1/identity/me/permissions` | any role | List permissions for role |
| `POST` | `/api/v1/identity/me/claim-phone` | citizen | Link anonymous grievances to phone |
| `GET` | `/api/v1/identity/departments` | any role | List departments |
| `GET` | `/api/v1/identity/departments/{id}` | any role | Get one department |
| `GET` | `/api/v1/identity/officers` | officer+ | List officers (dept-scoped for field roles) |
| `POST` | `/api/v1/identity/officers` | dept_admin+ | Create officer |
| `PATCH` | `/api/v1/identity/officers/{id}` | dept_admin+ | Update officer availability/capacity |

---

## Infra & tooling

**Local dev commands:**
```bash
# Boot infra
cd infra && docker compose up -d

# Run migrations
cd apps/api && source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" alembic upgrade head

# Seed DB
DATABASE_URL="postgresql://dcos:dcos@localhost:5432/dcos" python -m scripts.seed

# Run API
python main.py   # http://localhost:8000/docs

# Run tests (all 30 pass)
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" pytest

# Run web
cd ../.. && pnpm --filter web dev   # http://localhost:3000
```

**DB roles:**
- `dcos` — superuser; runs migrations and seeds; bypasses RLS (BYPASSRLS=t)
- `dcos_app` — non-superuser; application role; subject to RLS; password `dcos_app`

**Alembic versions:**
- `0001` — full schema (19 tables + all indexes + trigger)
- `0002` — RLS policies (ENABLE + FORCE + 13 policies across 5 tables)

**CI pipeline** (`.github/workflows/ci.yml`):
- `api-lint` — ruff + mypy
- `api-test` — pytest with Postgres service container
- `web-lint` — ESLint + tsc
- `web-build` — `next build`
- `docker-build` — on main only

---

## Gotchas & decisions log

| Decision | Reason |
|---|---|
| Pure-ASGI `RequestIDMiddleware` (not `BaseHTTPMiddleware`) | BaseHTTPMiddleware + asyncpg creates task/event-loop mismatch |
| `asyncio_default_test_loop_scope = "session"` in pytest | asyncpg pool ties to the event loop; function-scoped loops break it |
| `dcos_app` non-superuser role for RLS tests | PostgreSQL superusers (`dcos`) always bypass RLS even with FORCE |
| `latitude`/`longitude` floats + DB trigger for `location` | Avoids asyncpg/geoalchemy2 binary type encoding in ORM writes |
| `set_config('app.*', true)` with `is_local=true` in `get_rls_db` | RLS vars are transaction-scoped; cleared automatically on commit |
| `asyncio_default_fixture_loop_scope = "session"` in pytest | Same engine/pool across all tests |
| Seed uses raw asyncpg, not SQLAlchemy | Simpler geo/vector insert; avoids ORM type codec issues |
| `channel_meta` column (not `metadata`) in Grievance | `metadata` is reserved by SQLAlchemy's Declarative API |
| `FORCE ROW LEVEL SECURITY` on scoped tables | Forces even table-owner to follow policies (but not superusers) |

---

## Epics 8–10 reference (completed)

### Epic 8 — Citizen transparency

- `app/core/notifications.py` — idempotent WhatsApp/SMS/push dispatcher; `status_change_message()` bilingual templates (en/hi)
- `citizen/service.py` — `submit_feedback()` (CSAT 1-5; ≥3 → VERIFIED, ≤2 → auto-reopen), `reopen()`, `get_public_stats()`, `notify_status_change()`
- `citizen/router.py` — POST /citizen/feedback/{id}, POST /citizen/reopen/{id}, GET /citizen/public-stats
- Worker: `notify_citizen` job; relay_outbox dispatches it for `grievance.assigned/escalated/reopened`
- Frontend: `/track/[id]/feedback` (star rating + comment), `/track/[id]/reopen` (reason form), `/public` (live KPI tiles, category bars, dept table, hotspot wards)

### Epic 9 — Analytics & Reporting

- Migration `0005`: `notification_preferences` table + 3 materialized views + `refresh_analytics_views()` PG function
- `analytics/service.py` — `get_kpis()`, `get_hotspots()`, `get_dept_leaderboard()`, `get_trend()`, `nl_query()` (NL→SQL via Gemini, guarded by `FEATURE_ANALYTICS_NL_QUERY`), `get_executive_brief()`, `refresh_views()`
- `reporting/service.py` — CSV exports: grievances, dept scorecard, ward stats
- Worker: `refresh_analytics_views` cron job every 15 minutes
- Frontend: `/cm` (live KPI tiles, hotspot list, dept leaderboard), `/cm/analytics` (scorecard table, CSV download buttons, NL copilot)

### Epic 10 — Hardening (core)

- `SecurityHeadersMiddleware` — X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- `RateLimitMiddleware` — in-process sliding-window, per-IP; 30/min for intake, 200/min global; skipped in `local` env
- `integration/service.py` — `BaseAdapter` protocol + `RestAdapter` (webhook push) + `IntegrationService.push_status_to_dept()`
- `integration/router.py` — GET /integration/adapters, POST /integration/push/{id}

**Remaining for full Epic 10:** DPDP consent UI, PII field-level encryption, WCAG audit, load test, PITR restore drill, pen-test findings.

---

## Epic 7 reference (completed)

Officer console built in Epic 7:
- `WorkforceService.claim()` — ASSIGNED/ESCALATED → IN_PROGRESS
- `WorkforceService.resolve()` — blocked unless before+after proof photos exist;
  geo check: EXIF must be within 500m (`_haversine_m`); timestamp check: after > created_at
- `WorkforceService.add_note()` — internal note; if `is_handoff=True` re-routes grievance to new dept
- `WorkforceService.verify_proof()` — returns ProofVerificationResult with reasons list
- `WorkforceService.get_workload()` — dept officer summary with SLA breach counts
- API: queue (SLA-sorted), claim, action-taken, resolve, proof check, notes, request-info, workload
- Migration 0004: officer_notes table
- 12 tests: claim, illegal-transition, proof gate, handoff re-route, geo validation
- Next.js: officer queue (SLA countdown badges, claim button), grievance detail (tabs: notes/proof/resolve),
  dept-admin workload table

---

---

## Epic 4 reference (completed)

Omnichannel intake was built in Epic 4:
- `POST /api/v1/intake/grievances` — anonymous + authenticated, idempotency, emergency detect
- `GET /api/v1/intake/track/{id}` — public status timeline
- WhatsApp webhook: `GET+POST /api/v1/intake/webhooks/whatsapp`
- Media: `POST /api/v1/intake/grievances/{id}/attachments`
- `IntakeService.create_grievance()` — emergency detect (Hindi+English), reverse-geocode, outbox emit
- `_make_tracking_id()` uses UUID suffix (not sequential count — avoids race conditions)
- Intake uses `DbSession` + bypass, not `RlsDbSession` (INSERT is always allowed)

## Epic 5 reference (completed)

AI engine built in Epic 5:
- `AIService.enrich(grievance_id)` — Gemini classify+severity+spam+embed; mock mode when no key
- `_detect_cluster()` — pgvector cosine sim with CTE pattern (avoids ::vector parse issue)
- `record_correction()` — FeedbackLabel table for officer corrections
- Worker: `enrich_grievance` Arq job, `relay_outbox` cron dispatches events
- `CAST(:emb AS vector)` — always use this instead of `:emb::vector` (SQLAlchemy text() issue)

## Epic 6 reference (completed)

Routing + SLA engine built in Epic 6:
- `RoutingService.assign()` — dept+ward jurisdiction, load-balanced by open case count
- `SLAService.compute_sla()` — policy lookup (dept×category×priority), default fallback
- `SLAService.check_and_escalate()` — finds breached SLAs, escalates level 0→1→2→3
- Worker: `assign_grievance` + `check_sla_breaches` jobs registered
- Avoid NULL type ambiguity: build two query variants when ward_id is None (asyncpg limitation)
- `CAST(:ward_id AS uuid)` — same ::uuid parse issue as vector

---

## SQL gotchas with SQLAlchemy text() + asyncpg (always check these)

| Pattern | Problem | Fix |
|---|---|---|
| `:name::type` | SQLAlchemy parser doesn't replace `:name` before `::type` | Use `CAST(:name AS type)` |
| `::vector` | Same — and asyncpg binary protocol needs codec | `CAST(:emb AS vector)` |
| `::uuid` | Same | `CAST(:id AS uuid)` |
| `NULL` param type | asyncpg can't infer type of `$N` when value is `None` | Split into two queries based on None/not-None |

---

**Files to create/modify:**
- `app/modules/intake/router.py` — `POST /grievances` accepting text + media + geo + channel
- `app/modules/intake/service.py` — validation, media upload, emergency interception, outbox emit
- `app/modules/intake/schemas.py` — `GrievanceCreate`, `GrievanceRead`, `TrackingResponse`
- `apps/web/src/app/(citizen)/page.tsx` — real intake form (text, photo, voice, map pin)
- `apps/web/src/app/(citizen)/track/[id]/page.tsx` — real tracking timeline
- `scripts/seed.py` — already exists; no changes needed

**Key things to implement:**
1. `POST /api/v1/intake/grievances` with idempotency key
2. Reverse-geocode lat/lng → ward via PostGIS (`ST_Contains(ward.geometry, ST_MakePoint(...))`)
3. WhatsApp webhook (verify signature → idempotency check → create grievance)
4. Emergency keyword check → 112/ambulance guidance before queuing
5. Media upload to MinIO → return attachment URL
6. Emit `grievance.created` outbox event

**Citizen web form needs:**
- Language selector (hi/en/pa)
- Text area (raw_text)
- Photo/video upload (chunked → MinIO)
- Voice record → STT (Gemini, async worker)
- Map pin (MapLibre) + "Use my location" button
- Anonymous filing option + phone number for tracking

---

## Manual tasks (deferred to end of all epics)

1. Copy `.env.example` → `.env` in `apps/api/`, fill in:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET` = Supabase JWT Secret (Settings → API)
   - `GEMINI_API_KEY`
2. `pnpm install` from repo root
3. Staging deploy: Vercel (web) + Cloud Run/Render/Fly (api Docker image)
4. Add `dcos_app` role creation to `infra/postgres/init.sql` (currently only done manually — needed for fresh Docker volumes)
