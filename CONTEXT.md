# JanSetu — Engineering Context

> **Read this before every session.** Single source of truth for the live system.
> Repo name: `dcos`. Project name: JanSetu (जनसेतु).

---

## Quick orient

| Item | Value |
|---|---|
| **Project** | JanSetu — Delhi Governance Intelligence Platform |
| **Repo** | `dcos` (github.com/jmanan999/dcos) |
| **Frontend** | https://dcos-ecru.vercel.app |
| **API** | https://dcos.onrender.com |
| **Stack** | Next.js 15 + FastAPI 0.115 + Postgres 17 + Supabase + Groq AI + WhatsApp |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Python venv** | `apps/api/.venv/` — activate: `source apps/api/.venv/bin/activate` |
| **Local infra** | `cd infra && docker compose up -d` (Postgres 5432, Redis 6379, MinIO 9000) |
| **Run API** | `cd apps/api && python main.py` → http://localhost:8000/docs |
| **Run worker** | `arq app.worker.WorkerSettings` |
| **Run web** | `pnpm --filter web dev` → http://localhost:3000 |

---

## Production database (Supabase)

| Setting | Value |
|---|---|
| **Project ref** | `nggbydarhctzacxzivyw` |
| **Region** | ap-southeast-1 |
| **Pooler host** | `aws-1-ap-southeast-1.pooler.supabase.com` ← `aws-1`, NOT `aws-0` |
| **Port** | `5432` (session mode — 6543 transaction mode breaks asyncpg) |
| **DATABASE_URL** | `postgresql+asyncpg://postgres.nggbydarhctzacxzivyw:YOUR_SUPABASE_DB_PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?ssl=require` |
| **Migrations** | `0009` (latest) — run `alembic upgrade head` with the URL above |
| **Seed data** | 554+ grievances in production; local seed: `python -m scripts.seed` |

---

## Production accounts

| Email | Password | Role | Surface |
|---|---|---|---|
| `cm@delhi.gov.in` | `Dcos2026Admin!` | `cm_cell` | `/cm` — full governance OS |
| `admin@mcd.gov.in` | `Dcos2026Admin!` | `dept_admin` | `/dept` — dept workbench |
| `officer@mcd.gov.in` | `Dcos2026Field!` | `field_officer` | `/officer` — field console |
| Any phone (demo) | OTP: `000000` | `citizen` | `/file`, `/track`, `/my-complaints` |

---

## Architecture — how requests flow

```
Browser → dcos-ecru.vercel.app
           │
           ├─ /api/v1/* → Vercel edge rewrite → dcos.onrender.com/api/v1/*
           │    (same-origin proxy in next.config.ts — no CORS needed)
           │
           └─ Everything else served by Next.js
```

**Key:** The frontend NEVER makes direct cross-origin requests to Render.
`NEXT_PUBLIC_API_URL` is empty string in production (proxy handles routing).
In local dev: set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `apps/web/.env.local`.

---

## Render service

| Setting | Value |
|---|---|
| **Service ID** | `srv-d8rdsiugvqtc73euukl0` |
| **URL** | `https://dcos.onrender.com` |
| **CORS_ORIGINS** | `["https://dcos-ecru.vercel.app","https://dcos.vercel.app","http://localhost:3000"]` (JSON array — pydantic-settings v2 requires JSON for `list[str]`) |
| **WhatsApp webhook** | `https://dcos.onrender.com/api/v1/intake/webhooks/whatsapp` |
| **Verify token** | `dcos-whatsapp-verify` |
| **Phone Number ID** | `1161544813712692` |
| **WA Business Account** | `888643953490341` |

---

## WhatsApp

Test number: **+1 555 660 9900**
Send "Hi" → language menu → "शुरू करें" → guided complaint filing in Hindi.
`FEATURE_WHATSAPP_INTAKE=true` must be set. Token expires every 60 days (regenerate in Meta dashboard).

---

## Frontend design system

1. **IC Bold tokens.** `bg-foreground` (#080808 near-black), `bg-accent` (#E8920A amber), `bg-background` (#FAFAFA off-white). Zero border-radius. Zero box-shadow. Source: `globals.css` + `tailwind.config.ts`.

2. **Fonts.** `Space Grotesk` (headings, labels, numbers via `font-grotesk`) + `Inter` (body text). Both loaded from Google Fonts via `layout.tsx`.

3. **Build from `@dcos/ui`.** Button, Card, StatCard, DataTable, PageHeader, Badge, StatusBadge, SeverityBadge, Tabs, Dialog, Alert, EmptyState, Skeleton, Input, Select, Avatar, Toast, cn.

4. **App-shell surfaces** (`/officer`, `/cm`, `/dept`) use `<AppShell sections={NAV}>` (which wraps `<LanguageProvider>`) + `<RouteGuard require="...">`.

5. **Data via SWR hooks** in `lib/hooks.ts`. Token auto-attached by `apiFetch`. BASE is `""` in production (same-origin proxy).

6. **Auth**: `useAuth()` from `lib/auth/provider`. Real Supabase ES256 in prod; local-JWT HS256 fallback. Demo citizen: phone `+919999000000`, OTP `000000`.

7. **i18n**: `useLanguage()` from `lib/i18n.tsx`. `LanguageProvider` wraps marketing/citizen/auth/transparency layouts AND is inside `AppShell` (authenticated surfaces).

---

## Route map (34 routes)

| Route | Surface | Auth |
|---|---|---|
| `/` | Landing | Public |
| `/file` | 3-step complaint form (DPDP consent + rights card) | Public |
| `/track` | Tracking lookup | Public |
| `/track/[id]` | Timeline + SLA breach alert + escalation links | Public |
| `/track/[id]/feedback` | CSAT feedback | Public |
| `/track/[id]/reopen` | Reopen request | Public |
| `/my-complaints` | Citizen complaint history | Citizen |
| `/login`, `/signup` | Auth pages | Public |
| `/privacy` | DPDP privacy policy | Public |
| `/wards` | 272 wards landing | Public |
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
| `/cm` | Control Room — KPIs, WPI, economic drag | cm_cell |
| `/cm/map` | Ward GIS heatmap | cm_cell |
| `/cm/hotspots` | Ward hotspot detail | cm_cell |
| `/cm/departments` | Department analytics | cm_cell |
| `/cm/contractors` | Contract list + correlation results | cm_cell |
| `/cm/contractors/new` | Contract entry form | cm_cell |
| `/cm/intelligence` | Budget intelligence — ROI grades | cm_cell |
| `/cm/analytics` | AI Chief Secretary (NL→SQL) | cm_cell |
| `/cm/reports` | Report generation | cm_cell |
| `/cm/predict` | Predictive alerts | cm_cell |
| `/cm/simulate` | Policy simulation | cm_cell |

---

## Backend modules (13)

| Module | Prefix | Purpose |
|---|---|---|
| `identity` | `/identity` | Auth, users, depts, officers |
| `intake` | `/intake` | Grievance filing (web/WhatsApp/API), attachments, tracking |
| `ai` | `/ai` | Groq classify + severity + embed + spam; NL→SQL |
| `routing` | `/routing` | Dept/officer assignment, load balancing |
| `sla` | `/sla` | SLA clocks + 4-level escalation |
| `workforce` | `/workforce` | Queue, resolve, proof gate, notes, route-plan, scorecard, checklist |
| `citizen` | `/citizen` | CSAT, reopen, public stats |
| `analytics` | `/analytics` | KPIs, hotspots, leaderboard, trend, WPI, economic drag, predictions |
| `contracts` | `/contracts` | Contract CRUD, correlation engine, budget, ward reps |
| `reporting` | `/reporting` | CSV exports |
| `integration` | `/integration` | Stub — external adapter framework |
| `platform` | `/platform` | Stub — reserved |
| `chatbot` | `/chatbot` | FAQ + Groq AI fallback, bilingual |

---

## Database — migrations

| # | What it adds |
|---|---|
| 0001 | Core tables: grievances, wards, districts, departments, officers, users, outbox, attachments, notifications, feedback |
| 0002 | RLS policies on all scoped tables |
| 0003 | AI tables: classifications, embeddings, spam flags, idempotency, clusters |
| 0004 | officer_notes, officer_availability |
| 0005 | Materialized views: mv_ward_stats, mv_dept_stats, mv_grievances_daily |
| 0006 | Real MCD ward names (272 wards from "Ward N" → actual names) |
| 0007 | attachments.file_hash, complaint_checklists (23 steps, 6 categories), checklist_completions |
| 0008 | contracts, contractor_performance, budget_allocations, ward_representatives (272 Delhi 2022 MCD councillors) |
| 0009 | Epic 4: predictive analytics, enhanced forecasting, burnout scores |

---

## Background workers (Arq)

| Job | Trigger | What |
|---|---|---|
| `enrich_grievance` | `grievance.created` outbox | Groq AI: classify + severity + embed + spam + cluster |
| `assign_grievance` | `grievance.enriched` outbox | Dept/officer routing + SLA clock |
| `notify_citizen` | 9 lifecycle events | WhatsApp/SMS status notification |
| `relay_outbox` | Cron every 5s | Dispatches outbox events |
| `check_sla_breaches` | Cron every 5min | 4-level auto-escalation |
| `refresh_analytics_views` | Cron every 15min | REFRESH MATERIALIZED VIEW |
| `correlate_contractors` | Cron Sunday 02:00 IST | Complaint spike analysis per contract |
| `compute_burnout_scores` | Cron Monday 07:00 IST | Officer burnout risk flags |
| `snapshot_wpi` | Cron Sunday 01:00 IST | WPI history snapshot per ward |

---

## Features built but NOT YET active

| Feature | Status | How to enable |
|---|---|---|
| IVR/voice intake | Stub — `FEATURE_VOICE_INTAKE=true` but no handler | Build IVR handler in `intake/` |
| SMS notifications (MSG91) | `MSG91_API_KEY` empty | Add key, wire in `notifications.py` |
| Email escalation | `escalation_email` stored per dept but not sent | Wire SMTP in `sla/` escalation |
| Web push notifications | VAPID keys set, not dispatched | Wire in `citizen/service.py` |
| `integration` module | Only `/health` — CPGRAMS push stub | Implement `RestAdapter` |
| `platform` module | Only `/health` | Reserved |
| OpenRouter API key | Set in env, unused — Groq is primary AI | Replace Groq if needed |
| Gemini API key | Set in env, unused | Replace Groq if needed |
| `walk_in` channel enum | Defined, no intake path | Build walk-in intake handler |

---

## Key architecture rules

1. **Vercel proxy first.** Frontend calls `/api/v1/*` — Vercel rewrites to Render. Never configure frontend to call Render directly.
2. **No cross-module table imports.** Call `B.service`, never `B.models` from another module.
3. **Transactional outbox.** Every state change writes an `OutboxEvent` in the same transaction.
4. **Status state machine** in `GrievanceStatus.allowed_transitions()`. Never set `.status` directly.
5. **Alembic migrations forward-only.** Never edit a shipped migration.
6. **RLS**: workers bypass via `set_config('app.bypass_rls','true',true)` — value must be string `'true'`, not `'on'`.
7. **CORS_ORIGINS** on Render must be a JSON array: `["https://...","http://..."]` — pydantic-settings v2 won't parse comma strings.
8. **Router path ordering**: static paths (`/scorecard/public`, `/ward-reps`) before `/{id}` parameterised routes.
9. **asyncpg + SQLAlchemy text()**: use `CAST(:id AS uuid)` not `:id::uuid`.
10. **Pooler session mode**: port 5432 on `aws-1`. Port 6543 (transaction mode) breaks asyncpg prepared statements.

---

## SQL gotchas

| Pattern | Problem | Fix |
|---|---|---|
| `:name::type` | SQLAlchemy misparses | `CAST(:name AS type)` |
| `NULL` param type | asyncpg can't infer | Split into two queries |
| Array server_default | `"'{}'"` double-quotes | `sa.text("'{}'")`  |

---

## Local dev quick-start

```bash
# Infra
cd infra && docker compose up -d

# API
cd apps/api && source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" alembic upgrade head
DATABASE_URL="postgresql://dcos:dcos@localhost:5432/dcos" python -m scripts.seed
python main.py                     # → http://localhost:8000/docs
arq app.worker.WorkerSettings      # Worker (separate terminal)

# Web
cd ../.. && pnpm --filter web dev  # → http://localhost:3000
```

**Dashboards empty?** Docker stopped → `cd infra && docker compose up -d` → restart API.

**Prod DB migrations:**
```bash
DATABASE_URL="postgresql+asyncpg://postgres.nggbydarhctzacxzivyw:YOUR_SUPABASE_DB_PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?ssl=require" \
  alembic upgrade head
```
