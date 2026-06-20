<div align="center">

# 🏛️ DCOS — Delhi Citizen Operating System

**Grievance & governance command center for Delhi NCT**

*File a complaint · AI routes it · Officers resolve with proof · CM sees everything*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-f55036)](https://groq.com)

**[Live Demo →](https://dcos-delhi.vercel.app)** | **[API Docs →](https://dcos.onrender.com/docs)** | **[GitHub →](https://github.com/jmanan999/dcos)**

</div>

---

## What it does

A citizen files a complaint about a broken streetlight in Hindi. In under 30 seconds, the Groq AI (Llama 3.3 70B) classifies it, scores its severity, assigns it to the right PWD officer in that ward, sets an SLA deadline, and sends the citizen a WhatsApp confirmation. The CM can watch the entire city's grievance load in real-time on a command center dashboard.

```
Citizen files → AI classifies + routes (1.4s) → Officer resolves with geo-proof → Citizen confirms
```

---

## Live Demo

| Surface | URL | Demo Credentials |
|---|---|---|
| 🏠 Citizen Portal | [dcos-delhi.vercel.app](https://dcos-delhi.vercel.app) | File anonymously, no login needed |
| 🔐 Login | [/login](https://dcos-delhi.vercel.app/login) | See accounts below |
| 📊 Transparency | [/transparency](https://dcos-delhi.vercel.app/transparency) | Public, no auth |
| 🏛️ CM Command Center | [/cm](https://dcos-delhi.vercel.app/cm) | `cm@delhi.gov.in` |
| 👮 Officer Console | [/officer](https://dcos-delhi.vercel.app/officer) | `officer@mcd.gov.in` |
| 📡 API Docs | [dcos.onrender.com/docs](https://dcos.onrender.com/docs) | Interactive Swagger UI |

### Demo Accounts

| Email | Password | Role | Access |
|---|---|---|---|
| `cm@delhi.gov.in` | `Dcos2026Admin!` | CM Cell | Full command center, analytics, all data |
| `admin@mcd.gov.in` | `Dcos2026Admin!` | MCD Admin | Department management, team workload |
| `officer@mcd.gov.in` | `Dcos2026Field!` | MCD Field Officer | Complaint queue, proof upload, resolution |

> **Note:** These are demo credentials for a development database seeded with synthetic Delhi data. Don't store real personal information here.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                          │
│  citizen (PWA) · officer console · CM dashboard · public portal  │
└──────────────────────┬───────────────────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   Next.js 15 (Vercel)     │  Modern GovTech design system
         │   23 routes, 4 surfaces   │  Supabase Auth (ES256 JWKS)
         └─────────────┬─────────────┘
                       │ REST / JSON
         ┌─────────────▼─────────────┐
         │   FastAPI modular API     │  11 domain modules
         │   + Arq background jobs  │  Rate limiting · Security headers
         └──────┬──────────┬────────┘
                │          │
       ┌────────▼──┐  ┌────▼────┐  ┌──────────────┐
       │ Supabase  │  │  Redis  │  │ MinIO / S3   │
       │ Postgres  │  │ Upstash │  │ Object store │
       │ PostGIS   │  │  queue  │  └──────────────┘
       │ pgvector  │  └─────────┘
       └───────────┘
```

| Layer | Stack |
|---|---|
| Frontend | Next.js 15, Tailwind CSS, Radix UI, Recharts, SWR |
| Auth | Supabase Auth (ES256 JWKS) + local-JWT dev fallback |
| API | FastAPI 0.115 (Python 3.12), async SQLAlchemy, Alembic |
| AI | **Groq — Llama 3.3 70B** (14,400 req/day free) + OpenRouter / Gemini fallback |
| Queue | Redis (Upstash) + Arq — classify · assign · notify · SLA · analytics |
| Database | PostgreSQL 17 (Supabase) + PostGIS + pgvector |
| Storage | MinIO (local) / S3-compatible (prod) |
| Notifications | WhatsApp Cloud API + MSG91 SMS + Web Push (VAPID) |

---

## Features

### For Citizens
- 🌐 **Multilingual** — file in Hindi, English, Punjabi, Urdu (text or voice)
- 📍 **Geo-aware** — one-tap location capture, ward auto-detected via PostGIS
- 📸 **Photo/video evidence** — upload at intake or proof-of-resolution
- 📱 **WhatsApp/SMS updates** — notified at every status change
- 🔄 **CSAT & reopen** — rate resolution, reopen if issue persists
- 🔒 **Anonymous filing** — no account required

### For Officers
- ⚡ **SLA-sorted queue** — see what's overdue first
- 📋 **Claim → Act → Resolve** — structured workflow with state machine
- 📷 **Geo-stamped before/after proof** — required for closure (tamper check)
- 🤝 **Department handoff** — reassign with reason, full audit trail
- 👥 **Team workload view** — dept admin sees all officers

### For the CM / Analytics
- 📊 **Live KPI tiles** — filed today, open backlog, SLA breaches, CSAT
- 🗺️ **GIS ward heatmap** — red/amber/green by complaint load (MapLibre)
- 🏆 **Department leaderboard** — resolution rate, avg time, reopen rate, CSAT
- 🤖 **AI copilot** — natural language → SQL ("which wards have the most unresolved complaints?")
- 📈 **14-day trend chart** — area chart, per-day complaint volume
- 📄 **CSV exports** — grievances, dept scorecard, ward stats
- 📋 **Executive brief** — auto-generated morning report

### Platform
- 🔐 **Role-based access control** — 6 roles, RLS-enforced at DB layer
- 🛡️ **Anti-escalation** — roles from admin-only `app_metadata`, never user-editable
- ⚡ **Transactional outbox** — no dropped events, idempotent workers
- 🔍 **Semantic dedup** — pgvector cosine similarity clusters related complaints
- 🚨 **Emergency intercept** — life-safety keywords bypass queue, return 112 guidance
- 📊 **Materialized views** — analytics queries on pre-aggregated data, refreshed every 15 min

---

## Local Development

### Prerequisites
- Docker Desktop
- Python 3.12+
- Node 20+ with pnpm (`npm install -g pnpm`)

### Quick Start

```bash
git clone https://github.com/jmanan999/dcos.git && cd dcos
pnpm install

# Configure
cp .env.example apps/api/.env
# Set GROQ_API_KEY in apps/api/.env (get free key at console.groq.com)

# Start infra (Postgres + Redis + MinIO)
cd infra && docker compose up -d && cd ..

# Migrate + seed (272 wards, 12 depts, 540 realistic Delhi complaints)
cd apps/api && source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" alembic upgrade head
DATABASE_URL="postgresql://dcos:dcos@localhost:5432/dcos" python -m scripts.seed

# Run everything
python main.py &                         # API  → http://localhost:8000/docs
arq app.worker.WorkerSettings &          # Worker (AI + SLA + notifications)
cd ../.. && pnpm --filter web dev        # Web  → http://localhost:3000
```

> **Dashboards show no data?** Docker stopped between sessions.
> Run `cd infra && docker compose up -d` then restart the API.

### Local Accounts (dev mode — any code works for OTP)

The login page shows a dev-mode banner when Supabase isn't configured.
Use the local token endpoint:

```bash
# Get a CM token
curl -X POST http://localhost:8000/api/v1/identity/token \
  -H "Content-Type: application/json" \
  -d '{"role": "cm_cell", "name": "CM Test"}'
```

---

## Production Deployment

### Frontend → Vercel

1. Connect `github.com/jmanan999/dcos` to Vercel
2. Set env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `vercel.json` at repo root handles monorepo routing

### Backend → Render / Cloud Run / Fly.io

**Render (fastest):**
- Root Directory: `apps/api`
- Build: `pip install -e .`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env vars: see `render.env.example` (copy from `.env.example`)

**Production DATABASE_URL pattern:**
```
postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres?ssl=require
```
Note: use port **5432** (session mode) — transaction mode (6543) doesn't support prepared statements with asyncpg.

### Run migrations on production

```bash
DATABASE_URL="postgresql://postgres.PROJ_REF:PASS@aws-1-REGION.pooler.supabase.com:5432/postgres?sslmode=require" \
  alembic upgrade head
```

### Provision officers (Supabase admin API)

```bash
curl -X POST "https://PROJECT.supabase.co/auth/v1/admin/users" \
  -H "apikey: SERVICE_KEY" -H "Authorization: Bearer SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "officer@delhi.gov.in",
    "password": "SecurePassword123!",
    "email_confirm": true,
    "app_metadata": { "dcos_role": "field_officer", "department_id": "DEPT_UUID" },
    "user_metadata": { "name": "Officer Name" }
  }'
```

Available roles: `citizen` · `field_officer` · `dept_admin` · `district_officer` · `cm_cell` · `super_admin`

---

## Project Structure

```
dcos/
├── apps/
│   ├── api/                    FastAPI modular monolith
│   │   ├── app/modules/        11 domain modules (identity, intake, ai, routing,
│   │   │                       sla, workforce, citizen, analytics, reporting,
│   │   │                       integration, platform)
│   │   ├── migrations/         Alembic (0001→0005) — PostGIS, pgvector, RLS, analytics
│   │   ├── scripts/seed.py     272 wards, 11 districts, 12 depts, 540 grievances
│   │   └── tests/              70 tests (auth, RLS, intake, AI, workforce)
│   └── web/                    Next.js 15 App Router
│       └── src/app/
│           ├── (marketing)/    / landing, /login, /signup
│           ├── (citizen)/      /file, /track/[id], /my-complaints
│           ├── (transparency)/ /transparency, /departments, /map
│           ├── (officer)/      /officer, /queue, /grievance/[id], /team
│           └── (cm)/           /cm, /map, /hotspots, /departments, /analytics, /reports
├── packages/
│   ├── ui/                     22-component design kit (Button, DataTable, StatCard…)
│   └── types/                  Shared TypeScript types
└── infra/
    └── docker-compose.yml      Postgres 16 + PostGIS + pgvector, Redis, MinIO
```

---

## Contributing

This is an open-source civic tech project. Contributions welcome.

1. Fork → branch → PR against `main`
2. Run `ruff check` + `mypy` + `pytest` before submitting
3. Follow the module boundaries (no cross-module table imports)
4. Read `CONTEXT.md` — it maps every file and every architectural decision

**Priority items from [`TODO.md`](TODO.md):**
- 🗺️ MapLibre GIS heatmap (data is ready, just needs the client component)
- 📱 Citizen phone OTP (needs Supabase phone provider + Twilio/MSG91)
- 💬 WhatsApp intake (Meta app + webhook registration)
- ♿ WCAG 2.1 AA accessibility audit
- 🏢 First real department adapter (MCD REST bridge)

---

## Security

- **Role escalation prevented** — roles from admin-only `app_metadata`, never user-editable `user_metadata`
- **Row Level Security** — PostgreSQL RLS enforced at DB layer (defense in depth)
- **JWT verification** — Supabase ES256 tokens verified via JWKS (not shared secret)
- **Rate limiting** — per-IP sliding window (30/min intake, 200/min global), active in non-local envs
- **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy on every response

---

## License

MIT License — see [LICENSE](LICENSE)

Built for the people of Delhi. Government of NCT of Delhi.

---

<div align="center">
  <sub>Stack: FastAPI · Next.js · Supabase · Groq · Postgres · Redis · Vercel · Render</sub>
</div>
