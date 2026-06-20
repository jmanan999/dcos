<div align="center">

# 🏛️ JanSetu

### Delhi Grievance Portal — *People's Bridge to the Government*

**File a civic complaint · AI routes it to the right department · Officers resolve with proof · CM tracks everything live**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/jmanan999/dcos/actions/workflows/ci.yml/badge.svg)](https://github.com/jmanan999/dcos/actions)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://python.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Groq AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3%2070B-f55036)](https://groq.com)
[![EN | हिं](https://img.shields.io/badge/Language-EN%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%82-orange)](https://dcos-ecru.vercel.app)

**[🌐 Live Demo](https://dcos-ecru.vercel.app)** &nbsp;·&nbsp; **[GitHub Repo](https://github.com/jmanan999/dcos)** &nbsp;·&nbsp; **[TODO / Roadmap](TODO.md)**

</div>

---

## What is JanSetu?

A citizen opens JanSetu, types in Hindi: *"Hamare ward mein sadak pe bahut bada gadda hai"*. Within 30 seconds, Groq AI classifies it as a pothole complaint, scores its severity, assigns it to the right MCD officer in that ward, and sets a 72-hour SLA deadline. The officer resolves it by uploading a geo-tagged before/after photo. The CM watches the entire city's complaint load live on a command center dashboard with a ward-level GIS heatmap.

**What makes it different:**
- 🤖 AI classification in **1.4 seconds** (not batch-processed next day)
- 🌍 Bilingual **English + Hindi** — toggle in one click, preference saved
- 🗺️ **GIS ward heatmap** — red/amber/green by complaint severity
- 🔒 **No privilege escalation** — officer roles are admin-only (app_metadata, not user_metadata)
- 📍 **Geo-verified proof** — officers must upload GPS-tagged before/after photos to close

---

## Live Demo

> ⚠️ The API runs on Render's **free tier** which sleeps after 15 min of inactivity.
> First request after idle may take 30–60 seconds to wake up. The **AI worker is not running
> in production** (requires Render Starter tier) — new complaints will stay at `RECEIVED` status.

| Surface | URL | Access |
|---|---|---|
| 🏠 Citizen Portal | [dcos-ecru.vercel.app](https://dcos-ecru.vercel.app) | Public — no login needed to file |
| 🌐 Hindi toggle | Header **EN \| हिं** button | Switches all citizen-facing UI |
| 📊 Transparency | [/transparency](https://dcos-ecru.vercel.app/transparency) | Public — live anonymized data |
| 🗺️ Ward Map | [/transparency/map](https://dcos-ecru.vercel.app/transparency/map) | Public — interactive heatmap |
| 🔐 Login | [/login](https://dcos-ecru.vercel.app/login) | Supabase Auth (email) |
| 🏛️ CM Command Center | [/cm](https://dcos-ecru.vercel.app/cm) | Login as `cm@delhi.gov.in` |
| 👮 Officer Console | [/officer](https://dcos-ecru.vercel.app/officer) | Login as `officer@mcd.gov.in` |

### Demo credentials

| Email | Password | Role |
|---|---|---|
| `cm@delhi.gov.in` | `Dcos2026Admin!` | CM Cell — full command center + analytics |
| `admin@mcd.gov.in` | `Dcos2026Admin!` | MCD Admin — team workload + reassignment |
| `officer@mcd.gov.in` | `Dcos2026Field!` | MCD Field Officer — queue, claim, resolve |

> **Note:** Phone OTP for citizens is not yet enabled (requires connecting Twilio/MSG91 in Supabase). Citizens currently file anonymously or via email signup.

---

## Tech stack

```
  Citizens (PWA, EN/हिं) · Officers · CM Dashboard · Public Transparency
                              │
              ┌───────────────▼────────────────┐
              │      Next.js 15 · Vercel        │  23 routes · 4 surfaces
              │  Tailwind · Radix · MapLibre    │  Supabase Auth (ES256)
              └───────────────┬────────────────┘
                              │ REST/JSON
              ┌───────────────▼────────────────┐
              │   FastAPI modular monolith      │  11 domain modules
              │   Python 3.12 · async           │  Rate limiting · RLS
              └──────┬────────────┬────────────┘
                     │            │
           ┌─────────▼──┐  ┌──────▼──┐  ┌──────────────┐
           │  Supabase   │  │  Redis   │  │  MinIO / S3  │
           │  Postgres   │  │ (Upstash)│  │  (media)     │
           │  PostGIS    │  │  queue   │  └──────────────┘
           │  pgvector   │  └──────────┘
           └─────────────┘
```

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), Tailwind CSS (semantic tokens), Radix UI, Recharts, MapLibre GL, SWR |
| **Bilingual UI** | `useLanguage()` context, 138 EN/हिं strings auto-generated via Groq |
| **Auth** | Supabase Auth (ES256 JWKS asymmetric) + local-JWT dev fallback (HS256) |
| **API** | FastAPI 0.115, async SQLAlchemy, Alembic migrations (5 revisions) |
| **AI** | Groq Llama 3.3 70B (~1.4s classify + severity + spam) · OpenRouter / Gemini fallback |
| **Task queue** | Redis (Upstash) + Arq — classify, assign, SLA escalation, analytics refresh, notify |
| **Database** | PostgreSQL 17 (Supabase) + PostGIS (geo) + pgvector (semantic dedup) |
| **GIS** | MapLibre GL + CARTO basemaps (free, no API key) |
| **Notifications** | Code complete for WhatsApp + MSG91 SMS + Web Push (VAPID) — needs credentials |

---

## Local development

### Prerequisites

- **Docker Desktop** (Postgres 16 + PostGIS + pgvector, Redis, MinIO)
- **Python 3.12** (`pyenv` or system Python)
- **Node 20+** with `pnpm` (`npm install -g pnpm`)
- **Git**

### Setup

```bash
# 1. Clone
git clone https://github.com/jmanan999/dcos.git
cd dcos

# 2. Install frontend dependencies
pnpm install

# 3. Configure backend
cp .env.example apps/api/.env
# Edit apps/api/.env — at minimum set:
#   GROQ_API_KEY=gsk_...   (get free at console.groq.com)
# Everything else (DB, Redis, MinIO) works out of the box locally.

# 4. Set up Python environment
cd apps/api
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

# 5. Start local infrastructure
cd ../../infra && docker compose up -d && cd ..

# 6. Run database migrations
cd apps/api && source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" alembic upgrade head

# 7. Seed with realistic Delhi data (272 wards, 12 depts, 540 grievances)
DATABASE_URL="postgresql://dcos:dcos@localhost:5432/dcos" python -m scripts.seed

# 8. Start the API
python main.py
# → http://localhost:8000/docs (Swagger UI, available locally only)

# 9. Start the background worker (in a separate terminal)
cd apps/api && source .venv/bin/activate
arq app.worker.WorkerSettings

# 10. Start the frontend (in a separate terminal)
cd /path/to/dcos
pnpm --filter web dev
# → http://localhost:3000
```

> **Dashboards showing no data?** Docker Desktop stopped between sessions.
> Run `cd infra && docker compose up -d` then restart the API (`python main.py`).

### Local dev accounts

When Supabase is not configured (`.env.local` has placeholder keys), the login page shows a **dev mode banner** — any email/password works and OTP isn't actually sent.

```bash
# Or use the local token endpoint directly:
curl -X POST http://localhost:8000/api/v1/identity/token \
  -H "Content-Type: application/json" \
  -d '{"role": "cm_cell", "name": "CM Test"}'
# → returns a JWT you can paste into browser localStorage as "dcos_token"
```

---

## Project structure

```
jansetu/  (git repo: dcos)
├── apps/
│   ├── api/                  FastAPI modular monolith (Python 3.12)
│   │   ├── app/modules/      11 domain modules: identity, intake, ai, routing,
│   │   │                     sla, workforce, citizen, analytics, reporting,
│   │   │                     integration, platform
│   │   ├── app/worker.py     Arq background jobs (AI, SLA, notifications, analytics)
│   │   ├── migrations/       Alembic 0001→0005 (schema, RLS, AI, notes, analytics views)
│   │   ├── scripts/seed.py   Realistic Delhi test data
│   │   ├── tests/            70 tests (auth, RLS, intake, AI, workforce)
│   │   └── Dockerfile        Multi-stage, $PORT compatible (Render/Cloud Run)
│   └── web/                  Next.js 15 — "JanSetu" brand
│       └── src/
│           ├── app/          23 routes across 4 route groups
│           ├── components/   AppShell, GisMap, MarketingHeader, Footer, etc.
│           ├── lib/          api.ts, hooks.ts, i18n.tsx, auth/, supabase/
│           └── scripts/      translate.mjs — auto-generate Hindi translations
├── packages/
│   ├── ui/                   @dcos/ui — 22 design-system components (Radix-backed)
│   └── types/                Shared TypeScript types
├── infra/
│   └── docker-compose.yml    Postgres 16 + PostGIS + pgvector, Redis 7, MinIO
├── vercel.json               Monorepo config for Vercel
├── render.env.example        Environment variables template for Render deployment
├── TODO.md                   Prioritised roadmap
└── CONTEXT.md                Architecture reference (read before modifying code)
```

---

## Bilingual support (EN / हिं)

The header **EN | हिं** toggle switches all citizen-facing text instantly. Language preference is saved to `localStorage`.

To add new strings or update existing translations:

```bash
# 1. Add your key → English string to STRINGS in:
apps/web/scripts/translate.mjs

# 2. Regenerate Hindi (Groq Llama 3.3 70B, ~2 minutes, free):
GROQ_API_KEY=gsk_... node apps/web/scripts/translate.mjs

# 3. Output auto-written to:
apps/web/src/lib/translations.generated.ts
```

Officer and CM admin surfaces remain in English (standard for government admin tools).

---

## Deploying to production

### Frontend → Vercel

1. Import `github.com/jmanan999/dcos` in Vercel dashboard
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` — your deployed API URL
   - `NEXT_PUBLIC_SUPABASE_URL` — `https://your-project.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase → Settings → API

### Backend → Render (or Cloud Run / Fly.io)

- Root directory: `apps/api`
- Build: `pip install -e .`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add a **second Background Worker service** with start command `arq app.worker.WorkerSettings`
  (required for AI classification — free tier sleeps and can't run persistent workers)
- Copy env vars from `render.env.example`

> **Important:** Use the Supabase **session-mode pooler** (port 5432, not 6543).
> Transaction mode (6543) doesn't support asyncpg prepared statements.
> Connection string: `postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres?ssl=require`

### Provisioning officers

Roles must come from `app_metadata` (admin-only). Never use `user_metadata` for roles.

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/auth/v1/admin/users" \
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

Get department UUIDs: `GET /api/v1/identity/departments`

Available roles: `citizen` · `field_officer` · `dept_admin` · `district_officer` · `cm_cell` · `super_admin`

---

## What's complete

| Component | Status | Notes |
|---|---|---|
| Backend — 10 epics | ✅ | All 11 modules, 5 migrations, 70 passing tests |
| AI classification | ✅ | Groq Llama 3.3 70B, ~1.4s end-to-end |
| Supabase auth | ✅ | ES256 JWKS, anti-escalation, 3 demo accounts |
| Modern GovTech frontend | ✅ | 23 routes, semantic design tokens, AppShell |
| Bilingual EN / हिं | ✅ | 138 strings, Groq auto-translation script |
| GIS ward heatmap | ✅ | MapLibre GL, CARTO, no API key required |
| CI/CD | ✅ | GitHub Actions — lint, typecheck, tests, build |
| Production deploy | ✅ | Vercel + Render (free tier, AI worker off) |
| WhatsApp intake | 🔧 | Code done — needs Meta App credentials |
| SMS notifications | 🔧 | Code done — needs MSG91 API key |
| Phone OTP (citizens) | 🔧 | Needs Supabase → Twilio/MSG91 connection |
| Arq worker in prod | 🔧 | Needs Render Starter ($7/mo) upgrade |

See **[TODO.md](TODO.md)** for the full roadmap and government deployment checklist.

---

## Security

| | |
|---|---|
| Role escalation | Roles read from admin-only `app_metadata` — `user_metadata` is ignored |
| JWT verification | Supabase ES256 via JWKS (not a shared secret) |
| Row Level Security | PostgreSQL RLS enforced at DB layer (defense in depth) |
| Rate limiting | Per-IP sliding window — active in staging/production, skipped locally |
| Security headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy on every response |
| CORS | Explicit allowlist — add every new domain manually |

---

## Contributing

1. Fork → branch off `main` → PR
2. `cd apps/api && ruff check . && mypy . && pytest` must pass
3. `pnpm --filter web typecheck && pnpm --filter web build` must pass
4. Read `CONTEXT.md` before touching existing modules — it maps every file and every decision

---

## License

[MIT](LICENSE) — built for the people of Delhi.

<div align="center">

**JanSetu** (जनसेतु) = *Jan* (people) + *Setu* (bridge)

*A bridge between citizens and the state.*

</div>
