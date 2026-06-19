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
| **8** | Citizen transparency & notifications | ⬜ |
| **9** | GIS command center & analytics | ⬜ |
| **10** | Hardening, compliance, observability, launch | ⬜ |

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
│   │   │       ├── citizen/        Feedback, Notification; Epic 8
│   │   │       ├── analytics/      Epic 9 — materialized views, NL→SQL
│   │   │       ├── reporting/      Epic 9 — PDF/PPTX
│   │   │       ├── integration/    Epic 10 — dept adapters
│   │   │       └── platform/       OutboxEvent, AuditLog, IdempotencyKey, District, Zone, Ward
│   │   │           ├── models.py   District, Zone, AssemblyConstituency, Ward, OutboxEvent,
│   │   │           │               AuditLog, IdempotencyKey
│   │   │           └── repository.py OutboxRepository, AuditRepository, GeoRepository
│   │   ├── app/worker.py           Arq worker: enrich_grievance, assign_grievance,
│   │   │                           check_sla_breaches, relay_outbox (cron every 5s)
│   │   │   Start: arq app.worker.WorkerSettings
│   │   ├── app/core/storage.py     Async boto3 upload helper (MinIO/S3/R2)
│   │   ├── migrations/
│   │   │   ├── env.py              Async Alembic env — imports ALL models for autogenerate
│   │   │   └── versions/
│   │   │       ├── 0001_initial_schema.py   All tables, enums, PostGIS/HNSW/GIN indexes,
│   │   │       │                             sync_grievance_location trigger
│   │   │       ├── 0002_rls_policies.py     RLS ENABLE + FORCE + all policies
│   │   │       ├── 0003_ai_tables.py        ai_results + feedback_labels
│   │   │       └── 0004_officer_notes.py    officer_notes table + dcos_app grant
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
│   └── web/                        Next.js 15 App Router — 4 route groups
│       └── src/app/
│           ├── (citizen)/          /  →  file form  |  /track/[id]  →  tracking
│           ├── (officer)/          /officer  →  dashboard  |  /officer/queue
│           │                       /officer/grievance/[id]  |  /officer/admin  →  officer mgmt
│           ├── (cm)/               /cm  →  command center  |  /cm/analytics
│           └── (public)/           /public  →  transparency dashboard
├── packages/
│   ├── ui/src/                     Button, Badge (SeverityBadge, StatusBadge), Card, Spinner
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
- Supabase issues JWTs; custom claims in `user_metadata.dcos_role` + `user_metadata.department_id`
- `app/core/auth.py::decode_token()` handles both Supabase JWTs and local JWTs
- `POST /api/v1/identity/token` issues local JWTs (disabled in production)

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

## What to build next — Epic 8

**Goal:** Citizen transparency — notifications (WhatsApp+SMS+push), CSAT, reopen, public dashboard.

**Files to create/modify:**
- `app/modules/citizen/service.py` — NotificationService + CSATService + ReopenService
- `app/modules/citizen/schemas.py` — NotificationRead, FeedbackCreate, ReopenRequest
- `app/modules/citizen/router.py` — POST /citizen/feedback, POST /citizen/reopen/{id}
- `app/core/notifications.py` — async WhatsApp/SMS/push dispatcher (idempotent + retry)
- `apps/web/src/app/(citizen)/track/[id]/feedback/page.tsx` — CSAT form after closure
- `apps/web/src/app/(public)/public/page.tsx` — live anonymized KPI dashboard

**Key things to implement:**
1. Notification worker — consumes `grievance.*` outbox events → WhatsApp + SMS + push
2. CSAT flow — POST /citizen/feedback (rating 1-5 + comment)
3. Reopen flow — citizen rejects closure → RESOLVED→REOPENED → outbox → re-route
4. Public dashboard — anonymized totals by ward/dept/category (no auth needed)
5. Notification preferences + opt-out + consent records (DPDP)

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
