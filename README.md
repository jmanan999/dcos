# 🏛️ JanSetu — जनसेतु

**Delhi Governance Intelligence Platform**

India's first end-to-end civic grievance OS — citizen files in 45s via WhatsApp in Hindi · AI routes in 1.4s · officer resolves with geo-proof · CM sees every ward's governance score in real time.

[![CI](https://github.com/jmanan999/dcos/actions/workflows/ci.yml/badge.svg)](https://github.com/jmanan999/dcos/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue)](apps/api)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](apps/web)

**[🌐 Live Demo](https://dcos-ecru.vercel.app)** · **[📡 API Docs](https://dcos.onrender.com/docs)** · **[🏗️ Architecture](#architecture)**

---

## What is JanSetu?

A vegetable vendor in Rohini sends a WhatsApp message: *"sarak par gadda hai."* JanSetu's AI classifies it in 1.4s, routes it to the right MCD officer in that ward, sets a 7-day legal SLA, and sends a WhatsApp confirmation with a tracking ID.

That's the citizen layer. Behind it:

- **Field officer** gets a geo-clustered route plan, an A–F performance grade, and a quality checklist that blocks resolution until before+after photos are uploaded.
- **Department nodal officer** sees a pendency aging board (0–7 / 8–15 / 16–30 / 30+ days), assigns cases, corrects AI misclassifications.
- **CM Cell** sees the Ward Productivity Index live — which ward costs ₹4.2L/day in unresolved complaints, which contractor had a 284% pothole spike after a ₹42L road contract, which budget allocation produced an F-grade ROI.

**This is not a complaint box. It is a governance operating system.**

---

## Live Demo

> ⚠️ API on Render free tier — first request after 15 min idle may take 30–60s to wake.

| Surface | URL | Who |
|---|---|---|
| 🏠 Citizen Portal | [dcos-ecru.vercel.app](https://dcos-ecru.vercel.app) | Public |
| 📋 File Complaint | [/file](https://dcos-ecru.vercel.app/file) | DPDP consent + citizen rights |
| 🔍 Track Complaint | [/track](https://dcos-ecru.vercel.app/track) | Public tracking by ID |
| 📊 Transparency | [/transparency](https://dcos-ecru.vercel.app/transparency) | Public live data |
| 🏘️ Ward Index | [/transparency/wards](https://dcos-ecru.vercel.app/transparency/wards) | 272 wards + councillor data |
| 🏗️ Contractor Scorecard | [/transparency/contractors](https://dcos-ecru.vercel.app/transparency/contractors) | Public complaint spike ranking |
| 🗺️ GIS Heatmap | [/transparency/map](https://dcos-ecru.vercel.app/transparency/map) | Ward-level severity |
| 🏛️ CM Control Room | [/cm](https://dcos-ecru.vercel.app/cm) | Login as CM |
| 👮 Officer Console | [/officer](https://dcos-ecru.vercel.app/officer) | Login as officer |
| 🤖 Chatbot | Floating button (all pages) | FAQ + Groq AI fallback |
| 🌐 EN/हिं toggle | Header | Instant UI language switch |

**Demo Accounts**

| Email | Password | Role |
|---|---|---|
| `cm@delhi.gov.in` | `Dcos2026Admin!` | CM Cell → `/cm` |
| `admin@mcd.gov.in` | `Dcos2026Admin!` | MCD Admin → `/dept` |
| `officer@mcd.gov.in` | `Dcos2026Field!` | Field Officer → `/officer` |
| Any phone | OTP: `000000` | Citizen → `/file`, `/track` |

---

## What's Built

### Citizen Experience
| Feature | Detail |
|---|---|
| 45-second complaint filing | Web form, WhatsApp voice in Hindi, or API |
| DPDP Act 2023 consent | Mandatory checkbox; consent logged before submission |
| Citizen rights at filing | Legal deadline (Right to Public Services Act) shown at success |
| SLA breach alerts | `/track/[id]` warns on breach with links to CPGRAMS + Lokayukta |
| Cluster notification | "You are 1 of 9 filing this — it has been escalated" |
| Bilingual EN/हिं | 138 strings, Groq auto-translation, instant header toggle |
| WhatsApp intake | Language menu → guided filing → real-time status updates |

### Field Operations
| Feature | Detail |
|---|---|
| Smart route planner | Geo-clusters complaints in 1.2km radius → Google Maps multi-stop URL |
| Officer scorecard | Resolution rate, CSAT, false-closure %, dept rank, A–F grade |
| Full case file | Audit trail + dept handoff history visible to receiving officer |
| Quality checklists | 23 steps across 6 categories; resolution blocked until complete |
| Proof integrity | MD5 hash per photo — reusing proof from another case returns 409 |

### Contractor & Budget Accountability
| Feature | Detail |
|---|---|
| Contract database | Enter contracts with ward coverage, type, value, dates |
| Auto-correlation | Weekly: complaint rate 90d pre-work vs 180d post-work |
| Public contractor scorecard | `/transparency/contractors` — spike % ranked, CSV download |
| Budget intelligence | Allocation vs complaint change → ROI grade A–F per department |
| Ward councillor data | 272 Delhi MCD 2022 election councillors with party data |
| Political accountability | WPI-by-party comparison (AAP vs BJP vs INC) |

### Governance Intelligence (CM)
| Feature | Detail |
|---|---|
| Ward Productivity Index | 272 wards scored 0–100, ranked publicly, updated daily |
| Economic drag | ₹/day cost of open complaints by category (NIPFP methodology) |
| Predictive alerts | Ward × category spike forecast with economic impact |
| AI Chief Secretary | NL→SQL: ask in plain English, get live data answers |
| Escalation pyramid | Live L0/L1/L2/L3 counts — who is sitting on what |
| Policy simulation | What-if budget/staffing changes → forecast impact |

---

## Architecture

```
Browser → dcos-ecru.vercel.app
          │
          ├─ /api/v1/* ──── Vercel edge proxy ──── dcos.onrender.com
          │                  (same-origin, no CORS)
          └─ All routes ─── Next.js 15

                    FastAPI 0.115 + Arq workers
                          │
           ┌──────────────┼──────────────┬──────────────┐
           ▼              ▼              ▼              ▼
    Supabase Postgres   Upstash Redis   MinIO/S3      Groq AI
    PostGIS + pgvector  WA state machine  Media       Llama 3.3 70B
```

| Layer | Stack |
|---|---|
| Frontend | Next.js 15, IC Bold design system, Tailwind CSS, Radix UI, MapLibre GL, Recharts, SWR |
| i18n | Hindi + English — 138 strings, instant toggle |
| Auth | Supabase Auth (ES256 JWKS); roles in `app_metadata` |
| API | FastAPI 0.115 (Python 3.12), async SQLAlchemy, Alembic (9 migrations) |
| WhatsApp | Meta Cloud API — interactive menus, Redis state machine, bilingual |
| AI | Groq Llama 3.3 70B (~1.4s) — classify, severity, spam, dedup, NL→SQL |
| Queue | Upstash Redis + Arq — 9 worker types |
| Database | PostgreSQL 17 (Supabase) + PostGIS + pgvector HNSW |

---

## Quickstart (Local)

**Prerequisites:** Docker Desktop · Python 3.12 · Node 24+ · pnpm (`npm i -g pnpm`)

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
arq app.worker.WorkerSettings         # Worker
cd ../.. && pnpm --filter web dev     # Web  → http://localhost:3000
```

**Dashboards empty?** `cd infra && docker compose up -d` then restart the API.

---

## Deployment

### Frontend → Vercel
Connect repo. Set these env vars in Vercel dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=https://nggbydarhctzacxzivyw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase>
# Do NOT set NEXT_PUBLIC_API_URL — the Vercel proxy handles routing
```

### Backend → Render
- Root: `apps/api` · Build: `pip install -e .` · Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add a **Background Worker**: `arq app.worker.WorkerSettings`
- Copy env vars from `render.env.example`

**Critical settings:**

```bash
# Session mode pooler — port 5432, NOT 6543 (transaction mode breaks asyncpg)
DATABASE_URL=postgresql+asyncpg://postgres.PROJECT:PASS@aws-1-REGION.pooler.supabase.com:5432/postgres?ssl=require

# JSON array format — required for pydantic-settings v2
CORS_ORIGINS=["https://your-app.vercel.app","http://localhost:3000"]
```

---

## Security

| Layer | Implementation |
|---|---|
| Role escalation | Roles only from admin `app_metadata` — `user_metadata` ignored |
| JWT | Supabase ES256 verified via JWKS |
| Webhook | WhatsApp webhooks verified via HMAC-SHA256 + App Secret |
| RLS | PostgreSQL Row Level Security on all scoped tables |
| Rate limiting | Per-IP sliding window (active in staging/prod) |

---

## Contributing

```bash
# Backend — lint and test
cd apps/api && source .venv/bin/activate
ruff format . && ruff check . --fix
pytest

# Frontend — typecheck and build
pnpm --filter web typecheck
pnpm --filter web build
```

Read `CONTEXT.md` before touching existing modules.

---

## License

MIT — built for the people of Delhi.

**JanSetu (जनसेतु)** = *Jan* (People) + *Setu* (Bridge)
