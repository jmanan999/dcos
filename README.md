# DCOS — Delhi Citizen Operating System

Grievance & governance command center for Delhi NCT.
File a complaint, let AI route it, track it end-to-end.

**Stack:** FastAPI · Next.js 15 · Postgres 16 (PostGIS + pgvector) · Supabase Auth · Groq AI (Llama 3.3 70B) · Redis · MinIO

---

## Architecture

```
  CLIENTS: citizen (PWA) · officer console · CM dashboard · public transparency
                              │ HTTPS
              ┌───────────────▼───────────────┐
              │     Next.js 15 (Vercel)        │  Modern GovTech design system
              │  23 routes, 4 surfaces         │  Supabase Auth (ES256 JWKS)
              └───────────────┬───────────────┘
                              │ REST
              ┌───────────────▼───────────────┐
              │    FastAPI modular monolith    │  11 domain modules
              │    + Arq background workers   │  Rate limiting · Security headers
              └──────┬───────────┬────────────┘
                     │           │
              ┌──────▼───┐  ┌───▼────┐  ┌──────────────┐
              │ Postgres  │  │ Redis  │  │ Object store │
              │ PostGIS   │  │ queue  │  │ MinIO / S3   │
              │ pgvector  │  │ cache  │  └──────────────┘
              └──────────┘  └────────┘
```

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 App Router, Tailwind (semantic tokens), Radix UI, Recharts, SWR |
| Auth | Supabase Auth (ES256 JWKS) + local-JWT dev fallback |
| API | FastAPI (Python 3.12), async SQLAlchemy, Alembic |
| AI | Groq — Llama 3.3 70B (14,400 req/day free) · fallback: OpenRouter / Gemini |
| Queue | Redis + Arq — classify · assign · notify · SLA escalation · analytics refresh |
| Database | PostgreSQL 16 + PostGIS (geo) + pgvector (semantic dedup) |
| Storage | MinIO (local) / S3-compatible (prod) |
| Notifications | WhatsApp Cloud API + MSG91 SMS + Web Push (VAPID keyed) |

---

## Quickstart (local)

```bash
# Prerequisites: Docker Desktop, Python 3.12, Node 20+, pnpm
git clone https://github.com/jmanan999/dcos.git && cd dcos
pnpm install

# Configure — copy and fill in GROQ_API_KEY + Supabase keys
cp .env.example apps/api/.env

# Start infra (Postgres, Redis, MinIO)
cd infra && docker compose up -d && cd ..

# Migrate + seed (758 realistic Delhi grievances)
cd apps/api && source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://dcos:dcos@localhost:5432/dcos" alembic upgrade head
DATABASE_URL="postgresql://dcos:dcos@localhost:5432/dcos" python -m scripts.seed

# Run everything (3 terminals)
python main.py                        # API  →  http://localhost:8000/docs
arq app.worker.WorkerSettings         # worker (AI + notifications + analytics)
cd ../.. && pnpm --filter web dev     # web  →  http://localhost:3000
```

> **Dashboards empty?** Docker stopped between sessions. Run `docker compose up -d` in `/infra` then restart the API.

---

## What's built

| Epic | Status |
|---|---|
| 1 — Foundation (monorepo, Docker, CI) | ✅ |
| 2 — Data model (Postgres, PostGIS, pgvector, seed) | ✅ |
| 3 — Identity (Supabase Auth, RBAC, RLS) | ✅ |
| 4 — Intake (web, WhatsApp, emergency intercept) | ✅ |
| 5 — AI engine (Groq classify, severity, spam, dedup) | ✅ |
| 6 — Routing & SLA (assignment, escalation ladder) | ✅ |
| 7 — Officer console (queue, proof gate, geo-verify) | ✅ |
| 8 — Citizen transparency (CSAT, reopen, notifications) | ✅ |
| 9 — Analytics (KPIs, hotspots, NL→SQL copilot, reports) | ✅ |
| 10 — Hardening (rate limiting, security headers, adapters) | ✅ core |
| FE — Modern GovTech design system (23 routes) | ✅ |

**See [TODO.md](TODO.md) for what remains.**

---

## Routes

```
/                       Landing (hero, live stats, features)
/login                  Citizen OTP | Officer email  (Supabase)
/signup                 Citizen registration
/file                   3-step complaint form (4 languages)
/track / /track/[id]    Status timeline + feedback + reopen
/my-complaints          Device-local complaint history

/transparency           Public KPI dashboard (recharts)
/transparency/departments  Department performance table
/transparency/map       Ward heatmap (placeholder — see TODO #5)

/officer                Dashboard, /queue (DataTable), /grievance/[id], /team
/cm                     Command center: KPIs + 14-day chart + hotspots
/cm/map /cm/hotspots /cm/departments /cm/analytics /cm/reports
```

---

## Security

- **Role escalation prevented** — roles come from admin-only `app_metadata`, not user-editable `user_metadata`. Provision officers via the Supabase admin API.
- **RLS** — PostgreSQL Row Level Security at the DB layer (defense in depth).
- **JWT** — Supabase ES256 tokens verified via JWKS (no shared secret).
- **Rate limiting** — per-IP sliding window, active in staging/production.
- **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy on every response.

---

## License

MIT. Built for the people of Delhi.
