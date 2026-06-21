<div align="center">

# 🏛️ JanSetu — जनसेतु

### Delhi's AI-Powered Civic Grievance Portal

**File a complaint via WhatsApp, web, or app · AI routes it in 1.4s · Officers resolve with geo-proof · CM tracks everything live**

[![CI](https://github.com/jmanan999/dcos/actions/workflows/ci.yml/badge.svg)](https://github.com/jmanan999/dcos/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://python.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Business%20API-25D366?logo=whatsapp&logoColor=white)](https://developers.facebook.com/docs/whatsapp)
[![Groq AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3%2070B-f55036)](https://groq.com)
[![Supabase](https://img.shields.io/badge/Auth-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![EN|हिं](https://img.shields.io/badge/Language-EN%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%82-orange)]()

**[🌐 Live Demo](https://dcos-ecru.vercel.app)** &nbsp;·&nbsp; **[📡 API](https://dcos.onrender.com/docs)** &nbsp;·&nbsp; **[📋 Roadmap](TODO.md)** &nbsp;·&nbsp; **[🏗️ Architecture](CONTEXT.md)**

</div>

---

## What is JanSetu?

A Delhi citizen sends a WhatsApp message: *"Bijli nahi hai 6 ghante se"*. JanSetu guides them through a menu in their language (Hindi/English), collects location + photo, and files the complaint. In under 30 seconds, Groq AI classifies it, routes it to the right BSES officer in that ward, sets a 72-hour SLA deadline, and sends the citizen a WhatsApp confirmation with a tracking ID.

The CM watches the entire city's grievance load live on a GIS command center.

---

## Live Demo

> ⚠️ API runs on Render **free tier** — first request after 15 min idle may take 30–60s to wake.
> AI classification worker not running (requires Render Starter $7/mo upgrade).

| Surface | URL | Access |
|---|---|---|
| 🏠 Citizen Portal | [dcos-ecru.vercel.app](https://dcos-ecru.vercel.app) | Public — no login to file |
| 🌐 EN/हिं toggle | Header toggle button | Switches all UI instantly |
| 📊 Transparency | [/transparency](https://dcos-ecru.vercel.app/transparency) | Public, live data |
| 🗺️ GIS Heatmap | [/cm/map](https://dcos-ecru.vercel.app/cm/map) | Login as CM |
| 🏛️ CM Dashboard | [/cm](https://dcos-ecru.vercel.app/cm) | `cm@delhi.gov.in` |
| 👮 Officer Console | [/officer](https://dcos-ecru.vercel.app/officer) | `officer@mcd.gov.in` |
| 🤖 JanSetu Chatbot | Floating button (bottom-right) | All pages |
| 📡 API Docs | Local only (`/docs` disabled in prod) | Run locally |

### Demo Accounts

| Email | Password | Role | Access |
|---|---|---|---|
| `cm@delhi.gov.in` | `Dcos2026Admin!` | CM Cell | Full command center |
| `admin@mcd.gov.in` | `Dcos2026Admin!` | MCD Admin | Team & dept management |
| `officer@mcd.gov.in` | `Dcos2026Field!` | MCD Officer | Complaint queue |

---

## WhatsApp Intake (Live)

Send a message to **+1 555 660 9900** (Meta test number):

```
Step 1  You: "Hello"
        Bot: Language selector → [हिंदी] [English]

Step 2  You: click हिंदी
        Bot: Main menu (interactive list)
             📋 शिकायत दर्ज करें
             🔍 शिकायत ट्रैक करें
             📊 मेरी शिकायतें
             About JanSetu

Step 3  You: select "📋 शिकायत दर्ज करें"
        Bot: Asks for problem description (with examples)

Step 4  You: "सड़क पर गड्ढा है, 3 दिन से कोई नहीं आया"
        Bot: "✅ Shikayat note ho gayi!"
             Asks for location [Skip] [Back]

Step 5  You: [share location pin]
        Bot: "📍 Location mil gayi!"
             Asks for photo [Skip] [Back]

Step 6  You: [send photo] or "Skip"
        Bot: 🏛️ Complaint filed!
             📋 Tracking ID: JS-20260621-XXXXXXXX
             🔍 Track: https://dcos-ecru.vercel.app/track/JS-...
             [Track Now] [New Complaint]
```

---

## Architecture

```
CHANNELS: WhatsApp · Web PWA · API · (IVR stub)
              │
  ┌───────────▼────────────────────────────────────┐
  │        Next.js 15 · Vercel                      │
  │  23 routes · 4 surfaces · EN/हिं toggle         │
  │  JanSetu chatbot (floating widget, Groq AI)      │
  └───────────────────────┬────────────────────────┘
                          │ REST
  ┌───────────────────────▼────────────────────────┐
  │        FastAPI · Render                         │
  │  12 domain modules · Arq background workers     │
  │  WhatsApp handler (Redis state machine)         │
  └────────┬────────────────┬───────────────────────┘
           │                │
  ┌────────▼─────┐  ┌───────▼──────┐  ┌────────────┐
  │  Supabase    │  │  Upstash     │  │ MinIO/S3   │
  │  Postgres 17 │  │  Redis       │  │  Media     │
  │  PostGIS     │  │  WA state    │  └────────────┘
  │  pgvector    │  └──────────────┘
  └──────────────┘
```

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 15, Tailwind (semantic tokens), Radix UI, MapLibre GL, Recharts, SWR |
| **i18n** | Hindi/English — 138 strings auto-translated via Groq (`translate.mjs`) |
| **Chatbot** | Floating widget — 7 FAQ topics + Groq AI fallback, bilingual |
| **Auth** | Supabase Auth (ES256 JWKS) + local-JWT dev fallback |
| **API** | FastAPI 0.115 (Python 3.12), async SQLAlchemy, Alembic (5 migrations) |
| **WhatsApp** | Meta Cloud API — interactive buttons/lists, Redis state, bilingual |
| **AI** | Groq Llama 3.3 70B (~1.4s) — classify, severity, spam, dedup, NL→SQL |
| **Queue** | Upstash Redis + Arq — AI classify, SLA, notifications, analytics refresh |
| **Database** | PostgreSQL 17 (Supabase) + PostGIS + pgvector |
| **GIS** | MapLibre GL + CARTO basemaps — ward-level heatmap |
| **Privacy** | [Privacy Policy](https://dcos-ecru.vercel.app/privacy) · DPDP Act 2023 |

---

## What's Built

| Feature | Status |
|---|---|
| Backend (10 epics: intake→AI→routing→SLA→officer→citizen→analytics→hardening) | ✅ |
| Modern GovTech frontend — 23 routes, 4 surfaces, AppShell | ✅ |
| Bilingual EN/हिं — 138 strings, Groq auto-translation, header toggle | ✅ |
| WhatsApp intake — language select, menu, guided flow, reports, Redis state | ✅ |
| JanSetu chatbot — FAQ + Groq AI, bilingual, floating widget | ✅ |
| GIS ward heatmap — MapLibre GL, CARTO, severity colored | ✅ |
| Supabase Auth — ES256 JWKS, anti-escalation (app_metadata) | ✅ |
| Privacy policy page — DPDP Act 2023 compliant | ✅ |
| CI/CD — GitHub Actions: lint, typecheck, 71 tests, build | ✅ |
| Deployed — Vercel (frontend) + Render (API) | ✅ |

**See [TODO.md](TODO.md) for what remains.**

---

## Quickstart (Local)

### Prerequisites
Docker Desktop · Python 3.12 · Node 20+ · pnpm (`npm i -g pnpm`)

```bash
# 1. Clone
git clone https://github.com/jmanan999/dcos.git && cd dcos
pnpm install

# 2. Configure
cp .env.example apps/api/.env
# Set GROQ_API_KEY in apps/api/.env (free at console.groq.com)

# 3. Infrastructure
cd infra && docker compose up -d && cd ..

# 4. Database
cd apps/api && python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" alembic upgrade head
DATABASE_URL="postgresql://dcos:dcos@localhost:5432/dcos" python -m scripts.seed

# 5. Run (3 terminals)
python main.py                        # API  → http://localhost:8000/docs
arq app.worker.WorkerSettings         # Worker (AI + SLA + notifications)
cd ../.. && pnpm --filter web dev     # Web  → http://localhost:3000
```

> **Dashboards empty?** `cd infra && docker compose up -d` then restart API.

### Update Hindi translations
```bash
GROQ_API_KEY=gsk_... node apps/web/scripts/translate.mjs
# Regenerates apps/web/src/lib/translations.generated.ts
```

---

## Deployment

### Frontend → Vercel
- Connect repo → set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Backend → Render
- Root: `apps/api` · Build: `pip install -e .` · Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Add a Background Worker** with `arq app.worker.WorkerSettings` (required for AI classification)
- Copy env vars from `render.env.example`
- **Database**: Supabase session-mode pooler, port **5432** (not 6543)
  ```
  DATABASE_URL=postgresql+asyncpg://postgres.PROJECT:PASS@aws-1-REGION.pooler.supabase.com:5432/postgres?ssl=require
  ```

### Provision Officers (Supabase admin API)
```bash
curl -X POST "https://PROJECT.supabase.co/auth/v1/admin/users" \
  -H "apikey: SERVICE_KEY" -H "Authorization: Bearer SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"officer@dept.gov.in","password":"...","email_confirm":true,
       "app_metadata":{"dcos_role":"field_officer","department_id":"UUID"},
       "user_metadata":{"name":"Officer Name"}}'
```

Roles: `citizen` · `field_officer` · `dept_admin` · `district_officer` · `cm_cell` · `super_admin`

### WhatsApp Setup
1. Meta → create App → add WhatsApp product → get Phone Number ID + Permanent Token + App Secret
2. Set on Render: `WHATSAPP_APP_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN=jansetu-whatsapp-verify`, `FEATURE_WHATSAPP_INTAKE=true`
3. Register webhook: `POST https://your-api.com/api/v1/intake/webhooks/whatsapp` · Verify token: `jansetu-whatsapp-verify` · Subscribe to: `messages`

---

## Security

| | |
|---|---|
| Role escalation | Roles only from admin `app_metadata` — `user_metadata` ignored |
| JWT | Supabase ES256 verified via JWKS (no shared secret) |
| Webhook | WhatsApp webhooks verified via HMAC-SHA256 + App Secret |
| RLS | PostgreSQL Row Level Security at DB layer |
| Rate limiting | Per-IP sliding window (active in staging/prod) |
| Headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |

---

## Contributing

```bash
# Backend
cd apps/api && source .venv/bin/activate
ruff format . && ruff check . --fix  # format + lint
pytest                                # 71 tests

# Frontend
pnpm --filter web typecheck
pnpm --filter web build
```

Read [CONTEXT.md](CONTEXT.md) before touching existing modules — it maps every file and every decision.

---

## License

[MIT](LICENSE) — built for the people of Delhi.

<div align="center">

**JanSetu** (जनसेतु) = *Jan* (People) + *Setu* (Bridge)

*A bridge between citizens and the government of Delhi.*

</div>
