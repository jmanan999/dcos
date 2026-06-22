# JanSetu — Context & Architecture Reference

> **Read this first in every conversation about JanSetu.**
> Project was previously called DCOS. All code references use `dcos` (repo name unchanged).
> Tracking ID prefix: `JS-YYYYMMDD-XXXXXXXX`.

---

## Quick orient

| Item | Value |
|---|---|
| **Project name** | **JanSetu** (People's Bridge) — Delhi Governance Intelligence Platform |
| Project root | `/Users/manan/dcos/` (git repo stays named `dcos`) |
| Live frontend | https://dcos-ecru.vercel.app |
| Live API | https://jansetu-api.onrender.com |
| GitHub | https://github.com/jmanan999/dcos |
| Stack | FastAPI 0.115 (Python 3.12) + Next.js 15 + Postgres 17 + Redis + Supabase + Groq AI + WhatsApp |
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
| `admin@mcd.gov.in` | `Dcos2026Admin!` | dept_admin → `/dept` |
| `officer@mcd.gov.in` | `Dcos2026Field!` | field_officer → `/officer` |
| Any phone (demo) | OTP: `000000` | citizen → `/file`, `/track` |

---

## EPICS.md — execution status

| Epic | Title | Status |
|---|---|---|
| **1** | Citizen Experience Revolution | ✅ Done |
| **2** | Field Operations Intelligence | ✅ Done |
| **3** | Contractor Accountability & Budget Intelligence | ✅ Done |
| **4** | Predictive Governance & Policy Simulation | 🔵 Pending |
| **5** | Open Government Platform | 🔵 Pending |

### Epic 1 — what was built
- DPDP Act 2023 consent checkbox blocks submission; consent logged
- Citizen legal rights shown at filing success screen (law + deadline)
- SLA breach alert on `/track/[id]` with direct links to CPGRAMS + Lokayukta escalation
- Complaint cluster notification ("You are 1 of 9 — escalated")

### Epic 2 — what was built
- `GET /workforce/route-plan` — greedy 1.2km geo-clustering, Google Maps deep-links, time savings estimate
- `GET /workforce/my-scorecard` — resolution rate, CSAT, false-closure %, dept rank (#N of M), A–F grade
- `GET /workforce/grievances/{id}/full-case` — audit trail + handoff department trail
- `GET|POST /workforce/grievances/{id}/checklist` — 23 steps across 6 categories; resolution blocked until complete
- `attachments.file_hash` (MD5) — duplicate proof rejected 409; `complaint_checklists` + `checklist_completions` tables
- Migration 0007

### Epic 3 — what was built
- `contracts` table + CRUD (`/contracts`) — contractor, dept, ward_ids, type, value, dates, status
- `contractor_performance` table — baseline vs post-work complaint rate, spike %, economic waste estimate
- `budget_allocations` table — dept × fiscal_year × period × amount_crore
- `ward_representatives` table — 272 Delhi MCD councillors seeded from 2022 elections
- `POST /contracts/{id}/correlate` — trigger correlation; weekly Arq cron runs automatically
- `GET /contracts/scorecard/public` — public contractor scorecard, ranked by spike %
- `GET /contracts/budget/outcomes` — ROI grade A–F per department for budget period
- `GET /contracts/ward-reps` — public, party-filterable ward councillor data
- `/transparency/contractors` — public page + CSV download (India's first public contractor scorecard)
- `/cm/contractors` + `/cm/contractors/new` — contract entry + management
- `/cm/intelligence` — budget intelligence with add-allocation modal
- `/transparency/wards` — party filter + WPI-by-party comparison + councillor per row
- Migration 0008

---

## 3-tier government hierarchy

| Tier | Route | Roles | Mental model |
|---|---|---|---|
| Field Officer | `/officer` | `field_officer` | Does the work on the ground |
| Nodal / Dept | `/dept` | `dept_admin`, `district_officer` | Assigns, monitors pendency, supervises team |
| CM Cell | `/cm` | `cm_cell`, `super_admin` | Cross-dept oversight, contractor, budget, root-cause |

---

## Frontend design system

1. **Global Sovereign tokens.** `bg-primary` (institutional navy), `text-on-surface`, `bg-surface-dim`, `border-outline-variant`, `text-label-caps`, 4px border-radius, zero box-shadow. Source: `globals.css` + `tailwind.config.ts`. Never raw hex.

2. **Build from `@dcos/ui`.** Components: Button, Card, StatCard, DataTable, PageHeader, Badge, StatusBadge, SeverityBadge, Tabs, Dialog, Alert, EmptyState, Skeleton, Input, Select, Avatar, Toast, cn.

3. **App-shell surfaces** (`/officer`, `/cm`, `/dept`) use `<AppShell sections={NAV}>` + `<RouteGuard require="...">` in a `"use client"` layout. Public surfaces use `MarketingHeader` + `Footer`.

4. **Data via SWR hooks** in `lib/hooks.ts`. Token auto-attached by `apiFetch`. Don't hand-roll `useEffect+fetch`.

5. **Auth**: `useAuth()` from `lib/auth/provider`. Real Supabase ES256 in prod; local-JWT HS256 fallback. Demo citizen login: phone `+919999000000`, OTP `000000` — pure localStorage, zero Supabase calls. Token in `localStorage.dcos_token` + `localStorage.dcos_user`.

6. **i18n**: `useLanguage()` from `lib/i18n.tsx` + `lib/translations.generated.ts` (138 strings). `LanguageProvider` wraps marketing/citizen/auth/transparency layouts.

7. **GIS map**: `components/GisMap.tsx` — MapLibre GL client component, CARTO basemaps (no API key), circle-per-ward colored by severity.

8. **Sidebar**: collapsible (80px↔224px), state persisted in `localStorage.sidebar_collapsed`.

---

## Route map (34 routes)

| Route | Surface | Auth |
|---|---|---|
| `/` | Landing (marketing) | Public |
| `/file` | 3-step complaint form (DPDP consent + rights card) | Public |
| `/track` | Tracking lookup | Public |
| `/track/[id]` | Timeline + SLA breach alert + escalation links | Public |
| `/track/[id]/feedback` | CSAT feedback | Public |
| `/track/[id]/reopen` | Reopen request | Public |
| `/my-complaints` | Citizen complaint history | Citizen |
| `/login`, `/signup` | Auth pages | Public |
| `/privacy` | DPDP privacy policy | Public |
| `/transparency` | Public stats dashboard | Public |
| `/transparency/wards` | WPI ranking + councillor data + party filter | Public |
| `/transparency/departments` | Dept leaderboard | Public |
| `/transparency/contractors` | Contractor scorecard + CSV | Public |
| `/transparency/map` | GIS heatmap | Public |
| `/officer` | Dashboard — queue, scorecard, route plan | field_officer |
| `/officer/queue` | Full grievance queue | field_officer |
| `/officer/team` | Team workload view | field_officer |
| `/officer/grievance/[id]` | Case detail — checklist, proof, history | field_officer |
| `/dept` | Pendency monitor (aging buckets) | dept_admin |
| `/dept/queue` | Assignment desk | dept_admin |
| `/dept/team` | Team workload + reassign | dept_admin |
| `/dept/triage` | AI category correction | dept_admin |
| `/cm` | Control Room — pendency, escalation pyramid | cm_cell |
| `/cm/map` | Ward GIS heatmap | cm_cell |
| `/cm/hotspots` | Ward hotspot detail | cm_cell |
| `/cm/departments` | Department analytics | cm_cell |
| `/cm/contractors` | Contract list + correlation results | cm_cell |
| `/cm/contractors/new` | Contract entry form | cm_cell |
| `/cm/intelligence` | Budget intelligence — ROI grades | cm_cell |
| `/cm/analytics` | AI Chief Secretary (NL→SQL) | cm_cell |
| `/cm/reports` | Report generation | cm_cell |

---

## Hooks in `lib/hooks.ts`

| Hook | Endpoint | Notes |
|---|---|---|
| `useKpis` | `/analytics/kpis` | Real-time KPIs, 30s refresh |
| `useHotspots` | `/analytics/hotspots` | Ward severity map |
| `useLeaderboard` | `/analytics/leaderboard` | Dept ranking |
| `useTrend` | `/analytics/trend` | Daily filed/resolved |
| `usePublicStats` | `/citizen/public-stats` | No-auth transparency |
| `useQueue` | `/workforce/queue` | Officer's assigned/in-progress |
| `useDeptQueue` | `/workforce/dept-queue` | Dept admin queue |
| `useWorkload` | `/workforce/workload` | Officer availability + load |
| `useDepartments` | `/identity/departments` | Dept dropdown |
| `usePendency` | `/analytics/pendency` | Aging buckets |
| `useEscalationPyramid` | `/analytics/escalation-pyramid` | L0–L3 counts |
| `useRootCause` | `/analytics/root-cause` | Repeat clusters, staffing gaps |
| `useAuditSample` | `/analytics/audit-sample` | 5% quality audit |
| `useEconomicDrag` | `/analytics/economic-drag` | ₹/day cost by category |
| `useWardIndex` | `/analytics/ward-index` | 272 wards WPI ranked |
| `usePredictions` | `/analytics/predictions` | Complaint spike forecasts |
| `useGovernanceScorecard` | `/analytics/governance-scorecard` | City Health Score |
| `useRoutePlan` | `/workforce/route-plan` | Geo-clustered stops |
| `useMyScorecard` | `/workforce/my-scorecard` | A–F grade + dept rank |
| `useContractorScorecard` | `/contracts/scorecard/public` | Public contractor ranking |
| `useContracts` | `/contracts` | Admin contract list |
| `useBudgetAllocations` | `/contracts/budget/allocations` | Budget entries |
| `useBudgetOutcomes` | `/contracts/budget/outcomes` | ROI grades |
| `useWardReps` | `/contracts/ward-reps` | 272 councillors |

---

## Backend modules (13)

| Module | Prefix | What it does |
|---|---|---|
| `identity` | `/identity` | Auth, users, depts, officers, phone-claim |
| `intake` | `/intake` | Grievance filing; tracking ID `JS-YYYYMMDD-XXXXXXXX`; attachment + hash |
| `ai` | `/ai` | Groq classify + severity + embed + spam; feedback loop; NL→SQL |
| `routing` | `/routing` | Dept/officer assignment, load balancing, reassign |
| `sla` | `/sla` | SLA clocks + 4-level escalation ladder |
| `workforce` | `/workforce` | Queue, claim, resolve, geo-proof gate, notes, handoff, route-plan, scorecard, checklist |
| `citizen` | `/citizen` | CSAT, reopen, public stats, notification dispatch |
| `analytics` | `/analytics` | KPIs, hotspots, leaderboard, trend, pendency, escalation pyramid, root-cause, audit, economic drag, WPI, predictions, scorecard, NL→SQL |
| `contracts` | `/contracts` | Contract CRUD, correlation engine, public scorecard, budget allocations, budget outcomes, ward reps |
| `reporting` | `/reporting` | CSV exports (grievances, dept scorecard, ward stats) |
| `integration` | `/integration` | Dept adapter framework (BaseAdapter + RestAdapter) |
| `platform` | `/platform` | OutboxEvent, AuditLog, IdempotencyKey, District, Zone, Ward |
| `chatbot` | `/chatbot` | Floating widget FAQ + Groq AI fallback, bilingual |

---

## Database — migrations

| # | File | What it adds |
|---|---|---|
| 0001 | `initial_schema.py` | All core tables: grievances, wards, districts, zones, departments, officers, status_events, outbox_events, attachments, notifications, feedback, escalation_records, RLS types |
| 0002 | `rls_policies.py` | Row Level Security policies on all scoped tables |
| 0003 | `ai_tables.py` | ai_classifications, ai_embeddings, ai_spam_flags, idempotency_keys, cluster tables |
| 0004 | `officer_notes.py` | officer_notes, officer_availability |
| 0005 | `analytics_views.py` | mv_ward_stats, mv_dept_stats, mv_grievances_daily (materialized views) |
| 0006 | `ward_names.py` | Updates 272 ward names from "Ward N" to real MCD names |
| 0007 | `epic2_field_ops.py` | attachments.file_hash, complaint_checklists (23 seeded steps, 6 categories), checklist_completions |
| 0008 | `epic3_contractor_accountability.py` | contracts, contractor_performance, budget_allocations, ward_representatives + 272 Delhi 2022 MCD councillors seeded |

---

## Database — key tables

| Table | Notes |
|---|---|
| `grievances` | Core. `embedding vector(768)`, `location geography(POINT)`. HNSW + GiST + GIN indexes. |
| `status_events` | Append-only audit log. Source of truth for timeline + accountability. |
| `outbox_events` | Transactional outbox. SKIP LOCKED relay. Processed by Arq worker. |
| `complaint_checklists` | Per-category quality steps (seed: 23 rows, 6 categories). |
| `checklist_completions` | Officer's progress per grievance. Unique constraint: one completion per (grievance, step). |
| `contracts` | Government contracts with ward_ids[], type, value_lakh, start/end dates, status. |
| `contractor_performance` | Auto-computed baseline vs post-work complaint rate + spike % + economic waste. |
| `budget_allocations` | Dept × fiscal_year × period × amount_crore. |
| `ward_representatives` | One row per ward. 272 Delhi MCD 2022 election councillors seeded. |
| `mv_ward_stats` | Materialized. Ward-level open/total/SLA counts. Refreshed every 15min. |
| `mv_dept_stats` | Materialized. Dept resolution rate, CSAT, reopen rate. |
| `mv_grievances_daily` | Materialized. Daily rollup by dept × category. |
| `feedback` | CSAT 1–5 after closure. Auto-triggers reopen if score ≤ 2. |
| `escalation_records` | Every escalation step (4 levels). |

---

## Arq worker jobs

| Job | Trigger | What |
|---|---|---|
| `enrich_grievance` | On `grievance.created` outbox event | Groq AI: classify + severity + embed + spam + cluster |
| `assign_grievance` | On `grievance.enriched` outbox event | Dept/officer routing + SLA clock start |
| `notify_citizen` | On any of 9 lifecycle events | WhatsApp/SMS status-change notification |
| `relay_outbox` | Cron every 5s | Dispatches enrich + assign + notify jobs from outbox |
| `check_sla_breaches` | Cron every 5min | Detects breach, escalates up the 4-level ladder |
| `refresh_analytics_views` | Cron every 15min | REFRESH MATERIALIZED VIEW for mv_* |
| `correlate_contractors` | Cron Sunday 02:00 IST (20:30 UTC) | Computes complaint spike for all completed contracts |

---

## Key architecture rules

1. **No cross-module table imports.** Call `B.service`, never `B.models` from another module.
2. **Transactional outbox.** Every state change writes an `OutboxEvent` in the same transaction.
3. **Status state machine** in `GrievanceStatus.allowed_transitions()`. Never set `.status` directly.
4. **Alembic migrations forward-only.** Never edit a shipped migration.
5. **Feature flags** in `config.py`: `FEATURE_AI_CLASSIFY`, `FEATURE_WHATSAPP_INTAKE`, `FEATURE_ANALYTICS_NL_QUERY`.
6. **RLS**: use `RlsDbSession` for scoped reads. Workers bypass via `set_config('app.bypass_rls','true',true)`.
7. **Router path ordering**: static paths (e.g. `/scorecard/public`, `/ward-reps`) must be defined **before** `/{id}` parameterised routes or FastAPI captures them first.
8. **Array server_default**: use `sa.text("'{}'")`  not `"'{}'"` — the latter double-quotes in asyncpg.
9. **AI provider**: Groq (`llama-3.3-70b-versatile`) primary. `~1.4s` classification time.

---

## Auth & permissions

**Roles:** `citizen` | `field_officer` | `dept_admin` | `district_officer` | `cm_cell` | `super_admin`

**JWT flow:**
- Supabase project `nggbydarhctzacxzivyw` (ap-southeast-1) — **ES256** via JWKS, cached 1h.
- Role from `app_metadata.dcos_role` (admin-only write). `user_metadata` is ignored for roles.
- Local dev: HS256 via `JWT_SECRET`, issued by `POST /api/v1/identity/token` (disabled in prod).
- Demo citizen: phone `+919999000000`, OTP `000000` — pure `localStorage` bypass, zero Supabase calls.

**Supabase pooler:**
- Host: `aws-1-ap-southeast-1.pooler.supabase.com` (`aws-1`, not `aws-0`)
- Port: **5432** session mode (transaction mode 6543 breaks asyncpg prepared statements)

---

## SQL gotchas with SQLAlchemy text() + asyncpg

| Pattern | Problem | Fix |
|---|---|---|
| `:name::type` | SQLAlchemy doesn't replace `:name` before `::type` | Use `CAST(:name AS type)` |
| `::vector` | Same + asyncpg binary codec | `CAST(:emb AS vector)` |
| `::uuid` | Same | `CAST(:id AS uuid)` |
| `NULL` param type | asyncpg can't infer type of `$N` when value is None | Split into two queries |
| Array server_default | `server_default="'{}'"`  → `DEFAULT '''{}'''` | `server_default=sa.text("'{}'")`  |

---

## Local dev quick-start

```bash
# Boot infra
cd infra && docker compose up -d

# API
cd apps/api && source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" alembic upgrade head
DATABASE_URL="postgresql://dcos:dcos@localhost:5432/dcos" python -m scripts.seed
python main.py    # → http://localhost:8000/docs

# Worker (AI + SLA + notifications + analytics + contractor correlation)
arq app.worker.WorkerSettings

# Frontend
cd ../.. && pnpm --filter web dev    # → http://localhost:3000
```

**Dashboards empty?** Docker stopped → `cd infra && docker compose up -d` → restart API.

**Prod DB migrations:**
```bash
DATABASE_URL="postgresql+asyncpg://postgres.nggbydarhctzacxzivyw:PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?ssl=require" \
  alembic upgrade head
```
