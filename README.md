# 🏛️ JanSetu — Delhi Grievance Portal

**People's Bridge to the Government of Delhi**

*File a complaint · AI routes it · Officers resolve with proof · CM sees everything*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-f55036)](https://groq.com)
[![Bilingual](https://img.shields.io/badge/Language-EN%20%7C%20हिं-orange)](https://dcos-ecru.vercel.app)

**[Live Demo →](https://dcos-ecru.vercel.app)** | **[API Docs →](https://dcos.onrender.com/docs)** | **[GitHub →](https://github.com/jmanan999/dcos)**

---

## What is JanSetu?

A citizen files a complaint about a broken streetlight in Hindi. In under 30 seconds, Groq AI (Llama 3.3 70B) classifies it, scores its severity, assigns it to the right PWD officer in that ward, sets an SLA deadline, and sends the citizen a WhatsApp confirmation. The CM can watch the entire city's grievance load in real-time on a GIS command center dashboard.

```
Citizen files (EN/हिं) → AI classifies in 1.4s → Officer resolves with geo-proof → Citizen confirms
```

---

## Live Demo

| Surface | URL | Login |
|---|---|---|
| 🏠 Citizen Portal | [dcos-ecru.vercel.app](https://dcos-ecru.vercel.app) | File anonymously — no login needed |
| 🔐 Login | [/login](https://dcos-ecru.vercel.app/login) | See demo accounts below |
| 📊 Transparency | [/transparency](https://dcos-ecru.vercel.app/transparency) | Public, no auth |
| 🗺️ GIS Heatmap | [/transparency/map](https://dcos-ecru.vercel.app/transparency/map) | Public |
| 🏛️ CM Command Center | [/cm](https://dcos-ecru.vercel.app/cm) | `cm@delhi.gov.in` |
| 👮 Officer Console | [/officer](https://dcos-ecru.vercel.app/officer) | `officer@mcd.gov.in` |
| 📡 API Docs | [dcos.onrender.com/docs](https://dcos.onrender.com/docs) | Interactive Swagger |

### Demo Accounts

| Email | Password | Role |
|---|---|---|
| `cm@delhi.gov.in` | `Dcos2026Admin!` | CM Cell — full command center |
| `admin@mcd.gov.in` | `Dcos2026Admin!` | MCD Admin — officer management |
| `officer@mcd.gov.in` | `Dcos2026Field!` | MCD Field Officer — complaint queue |

---

## Architecture

```
  CLIENTS: citizen (PWA, EN/हिं) · officer console · CM dashboard · public portal
                              │ HTTPS
              ┌───────────────▼───────────────┐
              │   Next.js 15 (Vercel)          │  Modern GovTech, bilingual EN/हिं
              │   23 routes, 4 surfaces        │  Supabase Auth (ES256 JWKS)
              └───────────────┬───────────────┘
                              │ REST
              ┌───────────────▼───────────────┐
              │   FastAPI modular monolith     │  11 domain modules
              │   + Arq background workers    │  Rate limiting · Security headers
              └──────┬───────────┬────────────┘
                     │           │
              ┌──────▼───┐  ┌───▼────┐  ┌──────────────┐
              │ Supabase  │  │ Redis  │  │ Object store │
              │ Postgres  │  │Upstash │  │ MinIO / S3   │
              │ PostGIS   │  │ queue  │  └──────────────┘
              │ pgvector  │  └────────┘
              └──────────┘
```

| Layer | Stack |
|---|---|
| Frontend | Next.js 15, Tailwind (semantic tokens), Radix UI, Recharts, MapLibre GL, SWR |
| i18n | Hindi/English toggle — auto-translated via Groq, `useLanguage()` context |
| Auth | Supabase Auth (ES256 JWKS) + local-JWT dev fallback |
| API | FastAPI 0.115 (Python 3.12), async SQLAlchemy, Alembic |
| AI | **Groq — Llama 3.3 70B** (14,400 req/day free) · OpenRouter / Gemini fallback |
| Queue | Redis (Upstash) + Arq — classify · assign · notify · SLA · analytics refresh |
| Database | PostgreSQL 17 (Supabase) + PostGIS + pgvector |
| GIS | MapLibre GL + CARTO basemaps (no API key) — ward-level heatmap |
| Storage | MinIO (local) / S3-compatible (prod) |
| Notifications | WhatsApp Cloud API + MSG91 SMS + Web Push (VAPID keyed) |

---

## Quickstart (local)

```bash
git clone https://github.com/jmanan999/dcos.git && cd dcos
pnpm install

# Configure (set GROQ_API_KEY at minimum)
cp .env.example apps/api/.env

# Start infra
cd infra && docker compose up -d && cd ..

# Migrate + seed
cd apps/api && source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" alembic upgrade head
DATABASE_URL="postgresql://dcos:dcos@localhost:5432/dcos" python -m scripts.seed

# Run everything
python main.py &                        # API → http://localhost:8000/docs
arq app.worker.WorkerSettings &         # Worker (AI + SLA + notifications)
cd ../.. && pnpm --filter web dev       # Web → http://localhost:3000
```

> **Dashboards empty?** Docker stopped between sessions. Run `cd infra && docker compose up -d` then restart the API.

---

## Routes

```
/                       Landing (hero, live stats, EN/हिं toggle)
/login                  Citizen OTP | Officer email  (Supabase)
/signup                 Citizen registration
/file                   3-step complaint form (4 languages)
/track / /track/[id]    Status timeline + feedback + reopen
/my-complaints          Device-local complaint history

/transparency           Public KPI dashboard (recharts + live data)
/transparency/departments  Dept performance table
/transparency/map       Interactive MapLibre ward heatmap

/officer                Dashboard · /queue · /grievance/[id] · /team
/cm                     KPIs + trend chart + hotspots
/cm/map                 GIS heatmap (dark, CM view)
/cm/hotspots /cm/departments /cm/analytics /cm/reports
```

---

## What's built (all epics complete)

| | Status |
|---|---|
| Backend (Epics 1–10) | ✅ All 11 domain modules, 5 migrations, 70 tests passing |
| Modern GovTech frontend | ✅ 23 routes, semantic design system, AppShell |
| Bilingual EN/हिं | ✅ 138 strings auto-translated via Groq, toggle in header |
| GIS heatmap | ✅ MapLibre GL, ward circles colored by severity |
| Supabase Auth | ✅ ES256 JWKS, anti-escalation (app_metadata roles) |
| AI classification | ✅ Groq Llama 3.3 70B, ~1.4s/complaint |
| Production deployment | ✅ Vercel (frontend) + Render (API) |
| CI/CD | ✅ GitHub Actions — lint, typecheck, 70 tests, build |

**See [TODO.md](TODO.md) for what remains before government deployment.**

---

## i18n — Adding/updating translations

```bash
# Add new strings to STRINGS in:
apps/web/scripts/translate.mjs

# Regenerate Hindi (takes ~2 min, uses Groq free tier):
GROQ_API_KEY=gsk_... node apps/web/scripts/translate.mjs

# Output: apps/web/src/lib/translations.generated.ts
```

---

## Security

- **Role escalation prevented** — roles from admin-only `app_metadata`, never `user_metadata`
- **JWT verification** — Supabase ES256 tokens verified via JWKS (no shared secret)
- **RLS** — PostgreSQL Row Level Security at DB layer (defense in depth)
- **Rate limiting** — per-IP sliding window, active in staging/production
- **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy on all responses

---

## License

MIT — built for the people of Delhi.

> **JanSetu** (जनसेतु) = Jan (people/citizen) + Setu (bridge) — *People's Bridge*
