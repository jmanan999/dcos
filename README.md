# DCOS — Delhi Citizen Operating System

Grievance & governance command center for Delhi NCT.

## Architecture at a glance

| Layer | Stack |
|---|---|
| Frontend | Next.js 15 (App Router, TS), Tailwind, shadcn-style components, MapLibre |
| API | FastAPI (Python 3.12), modular monolith — 11 domain modules |
| Queue | Redis + Arq (async workers) |
| Database | PostgreSQL 16 + PostGIS + pgvector |
| Auth/Realtime | Supabase |
| Storage | Supabase Storage / MinIO (local) |
| AI | Gemini 2.5 Flash / Pro |
| Notifications | WhatsApp Cloud API + MSG91 SMS + Web Push |
| Observability | OpenTelemetry + Sentry + Grafana |

## Quickstart (local)

### Prerequisites
- Docker Desktop ≥ 4.x
- Node.js ≥ 20 + pnpm ≥ 10
- Python 3.12
- `cp .env.example .env` and fill in your values (Supabase, Gemini at minimum)

### 1. Start infrastructure

```bash
cd infra
docker compose up -d
# Postgres (5432), Redis (6379), MinIO (9000 + 9001 console) boot up
```

### 2. API

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Run DB migrations (Epic 2 adds real migrations)
alembic upgrade head

# Start dev server
python main.py
# → http://localhost:8000/docs
```

### 3. Web

```bash
# From repo root
pnpm install
pnpm --filter web dev
# → http://localhost:3000
```

### 4. Verify

```bash
curl http://localhost:8000/healthz         # {"status":"ok"}
curl http://localhost:8000/readyz          # {"status":"ok","checks":{...}}
curl http://localhost:8000/api/v1/intake/health
```

## Project structure

```
dcos/
├── apps/
│   ├── api/                    FastAPI modular monolith
│   │   ├── app/
│   │   │   ├── core/           config, db, deps, logging, middleware, telemetry
│   │   │   └── modules/
│   │   │       ├── identity/   auth, RBAC, users
│   │   │       ├── intake/     omnichannel ingestion (Epic 4)
│   │   │       ├── ai/         classify, severity, dedup (Epic 5)
│   │   │       ├── routing/    assignment, geo-routing (Epic 6)
│   │   │       ├── sla/        clocks, escalation (Epic 6)
│   │   │       ├── workforce/  officer queues, proof (Epic 7)
│   │   │       ├── citizen/    tracking, CSAT, reopen (Epic 8)
│   │   │       ├── analytics/  materialized views, NL→SQL (Epic 9)
│   │   │       ├── reporting/  PDF/PPTX/XLSX (Epic 9)
│   │   │       ├── integration/ dept adapters (Epic 10)
│   │   │       └── platform/   outbox, audit, flags (shared kernel)
│   │   ├── migrations/         Alembic (forward-only)
│   │   └── tests/
│   └── web/                    Next.js 4-surface app
│       └── src/app/
│           ├── (citizen)/      / and /track/[id]
│           ├── (officer)/      /officer/*
│           ├── (cm)/           /cm/* (command center)
│           └── (public)/       /public/* (transparency)
├── packages/
│   ├── ui/                     Shared React components
│   └── types/                  Shared TypeScript types
├── infra/
│   ├── docker-compose.yml      Local: Postgres, Redis, MinIO
│   └── postgres/               Custom image (PostGIS + pgvector)
└── .github/workflows/ci.yml    lint → typecheck → test → build
```

## Build epics

| Epic | Focus | Status |
|---|---|---|
| **1** | Foundation & DX (this) | ✅ Done |
| **2** | Full schema + seed + migrations | ⬜ Next |
| **3** | Identity, RBAC, RLS | ⬜ |
| **4** | Intake & channels (web + WhatsApp) | ⬜ |
| **5** | AI engine (classify, severity, dedup) | ⬜ |
| **6** | Routing, assignment, SLA engine | ⬜ |
| **7** | Officer console & field app | ⬜ |
| **8** | Citizen transparency & notifications | ⬜ |
| **9** | GIS command center & analytics | ⬜ |
| **10** | Hardening, compliance, observability | ⬜ |

## Development conventions

- **Module boundaries**: one module must never import another module's SQLAlchemy models directly — call the other module's `service.py` interface.
- **Outbox pattern**: every state change emits a `platform.OutboxEvent` in the same DB transaction; workers relay it.
- **Migrations**: forward-only. Never edit a shipped migration.
- **Feature flags**: half-built epics ship behind a `FEATURE_*` env flag.
- **No cross-module table reads**: if you need data from another module, call its service layer.

## CI

GitHub Actions runs on every push/PR:

1. `api-lint` — ruff + mypy
2. `api-test` — pytest with real Postgres service (pgvector + PostGIS)
3. `web-lint` — ESLint + TypeScript
4. `web-build` — `next build`
5. `docker-build` — on `main` only
