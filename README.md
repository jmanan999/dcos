<div align="center">

# 🏛️ JanSetu — जनसेतु

### Delhi Governance Intelligence Platform

**India's first end-to-end civic grievance OS — citizen files in 45s · AI routes in 1.4s · officer resolves with geo-proof · CM sees every ward's governance score and economic cost in real time**

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

A vegetable vendor in Rohini sends a WhatsApp message in Hindi: *"sarak par gadda hai."* JanSetu guides them through a menu in their language, collects GPS + photo, and files the complaint. In under 30 seconds, Groq AI classifies it, routes it to the right MCD officer in that ward, sets a 7-day SLA deadline, and sends a WhatsApp confirmation with a tracking ID.

That's the citizen layer. Behind it:

- **The field officer** gets a smart route plan for the day — geo-clustered complaints with Google Maps deep-links, an A–F performance grade vs their department, and a quality checklist that blocks resolution until before+after photos are uploaded.
- **The department nodal officer** sees a pendency aging board (0–7 / 8–15 / 16–30 / 30+ days), assigns cases, balances workload, corrects AI misclassifications.
- **The CM** sees the city's Ward Productivity Index live — which ward costs ₹4.2L/day in unresolved complaints, which contractor had a 284% pothole spike after a ₹42L road contract, which budget allocation produced an F-grade ROI, and which party's councillors are running worse wards.

This is not a complaint box. It is a **governance operating system**.

---

## Live Demo

> ⚠️ API on Render free tier — first request after 15 min idle may take 30–60s to wake.

| Surface | URL | Who |
|---|---|---|
| 🏠 Citizen Portal | [dcos-ecru.vercel.app](https://dcos-ecru.vercel.app) | Public — no login needed |
| 📋 File Complaint | [/file](https://dcos-ecru.vercel.app/file) | With DPDP consent + citizen rights |
| 🔍 Track Complaint | [/track](https://dcos-ecru.vercel.app/track) | Public tracking by ID |
| 📊 Transparency | [/transparency](https://dcos-ecru.vercel.app/transparency) | Public live data |
| 🏘️ Ward Index | [/transparency/wards](https://dcos-ecru.vercel.app/transparency/wards) | 272 wards ranked + councillor data |
| 🏗️ Contractor Scorecard | [/transparency/contractors](https://dcos-ecru.vercel.app/transparency/contractors) | Public — complaint spike % per contractor |
| 🗺️ GIS Heatmap | [/transparency/map](https://dcos-ecru.vercel.app/transparency/map) | Public ward-level severity |
| 🏛️ CM Control Room | [/cm](https://dcos-ecru.vercel.app/cm) | Login as CM |
| 📈 Budget Intelligence | [/cm/intelligence](https://dcos-ecru.vercel.app/cm/intelligence) | Budget → ROI grade per department |
| 🏗️ Contract Admin | [/cm/contractors](https://dcos-ecru.vercel.app/cm/contractors) | Contract accountability |
| 👮 Officer Console | [/officer](https://dcos-ecru.vercel.app/officer) | Login as officer |
| 🤖 JanSetu Chatbot | Floating button (bottom-right) | All pages |
| 🌐 EN/हिं toggle | Header button | Switches all UI instantly |

### Demo Accounts

| Email | Password | Role | Surface |
|---|---|---|---|
| `cm@delhi.gov.in` | `Dcos2026Admin!` | CM Cell | `/cm` — full governance OS |
| `admin@mcd.gov.in` | `Dcos2026Admin!` | MCD Admin | `/dept` — dept workbench |
| `officer@mcd.gov.in` | `Dcos2026Field!` | MCD Officer | `/officer` — field console |
| Any phone number | OTP: `000000` | Citizen | `/file`, `/track`, `/my-complaints` |

---

## What's Built (as of June 2026)

### Citizen Experience (Epic 1)
| Feature | Detail |
|---|---|
| 45-second complaint filing | 3-step web form, WhatsApp intake, or API |
| DPDP Act 2023 consent | Mandatory checkbox blocks submission; consent logged |
| Citizen rights at filing | Shows legal deadline (Right to Public Services Act) at success screen |
| SLA breach alerts | `/track/[id]` warns on breach with direct links to CPGRAMS + Lokayukta |
| Cluster notification | "You are 1 of 9 filing this — it has been escalated" |
| Bilingual EN/हिं | 138 strings, Groq auto-translation, instant toggle |

### Field Operations Intelligence (Epic 2)
| Feature | Detail |
|---|---|
| Smart route planner | Geo-clusters open complaints in 1.2km radius → Google Maps multi-stop URL |
| Officer scorecard | Resolution rate, CSAT, false-closure %, dept rank (#2 of 19), A–F grade |
| Full case file | Audit trail + department handoff trail — receiving officer sees full history |
| Quality checklists | 23 steps across 6 categories; resolution **blocked** until all complete |
| Proof integrity | MD5 hash on every photo — reusing a proof from another case returns 409 |

### Contractor Accountability & Budget Intelligence (Epic 3)
| Feature | Detail |
|---|---|
| Contract database | Enter any government contract with ward coverage, type, value, dates |
| Auto-correlation engine | Weekly: compares complaint rate 90 days pre-work vs 180 days post-work |
| Contractor flagging | Spike >150% = flagged (India's first public contractor accountability system) |
| Public contractor scorecard | `/transparency/contractors` — every contractor ranked, CSV download for journalists |
| Budget intelligence | Budget allocation vs complaint change → ROI grade A–F per department |
| Ward councillor data | 272 Delhi MCD councillors from 2022 elections — party, constituency, term |
| Political accountability | WPI-by-party comparison (AAP vs BJP vs INC average governance scores) |

### Governance Intelligence Layer (CM Command Center)
| Feature | Detail |
|---|---|
| Ward Productivity Index | Every ward scored 0–100 on resolution, SLA, speed, CSAT — ranked publicly |
| Economic drag | ₹/day cost of open complaints by category (NIPFP methodology) |
| Predictive alerts | Ward × category complaint spike forecast with economic impact |
| Governance scorecard | City Health Score A–F, 5% audit sample, chief secretary action items |
| AI Chief Secretary | NL→SQL: ask "which ward had most potholes last 30 days?" in plain English |
| Root-cause panel | Repeat cluster detection, category breach rates, understaffed dept detection |
| Escalation pyramid | Live counts at L0/L1/L2/L3 — who is sitting on what |

### Platform
| Feature | Status |
|---|---|
| 3-tier government hierarchy (citizen → field officer → nodal/dept → CM cell) | ✅ |
| 34 frontend routes across 4 authenticated surfaces + public transparency | ✅ |
| 13 backend modules (intake, AI, routing, SLA, workforce, analytics, contracts, +6) | ✅ |
| 8 database migrations applied to Supabase production | ✅ |
| 4-level auto-escalation with SLA enforcement | ✅ |
| Interactive WhatsApp intake — language selector, menu, guided filing, reports | ✅ |
| JanSetu chatbot — FAQ + Groq AI fallback, bilingual | ✅ |
| GIS ward heatmap — MapLibre GL, CARTO, severity-colored | ✅ |
| Transactional outbox + Arq background workers (AI, SLA, notifications, analytics) | ✅ |
| Proof-gated resolution (before + after photo required) | ✅ |
| RLS defence-in-depth + anti-escalation auth (app_metadata roles) | ✅ |
| DPDP Act 2023 compliance (consent capture, data minimisation) | ✅ |
| CI/CD — GitHub Actions (lint, typecheck, 71 tests, build) | ✅ |
| Deployed — Vercel (frontend) + Render (API) + Supabase (DB + Auth) | ✅ |

---

## Architecture

```
CHANNELS:  WhatsApp · Web PWA · API · (IVR stub)
                │
   ┌────────────▼──────────────────────────────────┐
   │         Next.js 15 · Vercel                    │
   │  34 routes · 4 auth surfaces · EN/हिं toggle   │
   │  JanSetu chatbot (floating widget, Groq AI)     │
   └────────────────────────┬──────────────────────┘
                            │ REST / JSON
   ┌────────────────────────▼──────────────────────┐
   │         FastAPI 0.115 · Render                 │
   │  13 domain modules · Arq background workers    │
   │  WhatsApp handler (Redis state machine)        │
   └─────────┬──────────────┬────────────┬─────────┘
             │              │            │
   ┌─────────▼──────┐ ┌─────▼──────┐ ┌──▼─────────┐
   │  Supabase      │ │  Upstash   │ │ MinIO / S3 │
   │  Postgres 17   │ │  Redis     │ │  Media     │
   │  PostGIS       │ │  WA state  │ └────────────┘
   │  pgvector      │ └────────────┘
   └────────────────┘
```

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 15, Tailwind (Global Sovereign tokens), Radix UI, MapLibre GL, Recharts, SWR |
| **i18n** | Hindi/English — 138 strings, Groq auto-translation, instant toggle |
| **Chatbot** | Floating widget — 7 FAQ topics + Groq AI fallback, bilingual |
| **Auth** | Supabase Auth (ES256 JWKS) + local-JWT dev fallback; roles from `app_metadata` |
| **API** | FastAPI 0.115 (Python 3.12), async SQLAlchemy, Alembic (8 migrations) |
| **WhatsApp** | Meta Cloud API — interactive buttons/lists, Redis state, bilingual |
| **AI** | Groq Llama 3.3 70B (~1.4s) — classify, severity, spam, dedup, NL→SQL |
| **Queue** | Upstash Redis + Arq — AI classify, SLA, notifications, analytics refresh, contractor correlation |
| **Database** | PostgreSQL 17 (Supabase) + PostGIS + pgvector |
| **GIS** | MapLibre GL + CARTO basemaps — ward-level heatmap |
| **Privacy** | DPDP Act 2023 — consent capture at filing, data minimisation |

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
arq app.worker.WorkerSettings         # Worker (AI + SLA + notifications + analytics)
cd ../.. && pnpm --filter web dev     # Web  → http://localhost:3000
```

> **Dashboards empty?** `cd infra && docker compose up -d` then restart API.

---

## Deployment

### Frontend → Vercel
Connect repo → set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Backend → Render
- Root: `apps/api` · Build: `pip install -e .` · Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Add a Background Worker** with `arq app.worker.WorkerSettings` (required for AI + contractor correlation)
- Copy env vars from `render.env.example`
- **Database**: Supabase session-mode pooler, port **5432** (not 6543)
  ```
  DATABASE_URL=postgresql+asyncpg://postgres.PROJECT:PASS@aws-1-REGION.pooler.supabase.com:5432/postgres?ssl=require
  ```

### Provision Officers
```bash
curl -X POST "https://PROJECT.supabase.co/auth/v1/admin/users" \
  -H "apikey: SERVICE_KEY" -H "Authorization: Bearer SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"officer@dept.gov.in","password":"...","email_confirm":true,
       "app_metadata":{"dcos_role":"field_officer","department_id":"UUID"},
       "user_metadata":{"name":"Officer Name"}}'
```

Roles: `citizen` · `field_officer` · `dept_admin` · `district_officer` · `cm_cell` · `super_admin`

---

## Security

| | |
|---|---|
| Role escalation | Roles only from admin `app_metadata` — `user_metadata` ignored |
| JWT | Supabase ES256 verified via JWKS (no shared secret) |
| Webhook | WhatsApp webhooks verified via HMAC-SHA256 + App Secret |
| RLS | PostgreSQL Row Level Security at DB layer on all scoped tables |
| Rate limiting | Per-IP sliding window (active in staging/prod) |
| Headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |

---

## Contributing

```bash
# Backend
cd apps/api && source .venv/bin/activate
ruff format . && ruff check . --fix
pytest

# Frontend
pnpm --filter web typecheck
pnpm --filter web build
```

Read [CONTEXT.md](CONTEXT.md) before touching existing modules.

---

## License

[MIT](LICENSE) — built for the people of Delhi.

<div align="center">

**JanSetu** (जनसेतु) = *Jan* (People) + *Setu* (Bridge)

*A bridge between citizens and the governance of Delhi.*

</div>
