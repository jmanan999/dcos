# JanSetu — Roadmap & What's Left

> **State as of 2026-06-22**
> EPICS.md Epics 1, 2, 3 complete ✅ · Epic 4 (Predictive) and Epic 5 (Open Platform) pending.
>
> **Live:** https://dcos-ecru.vercel.app · API: https://jansetu-api.onrender.com

---

## ✅ Completed (EPICS.md 1–3)

### Foundation
- FastAPI modular monolith — 13 modules, 8 migrations, Supabase Postgres 17 + PostGIS + pgvector
- Modern GovTech design system (Global Sovereign tokens) — 34 routes, 4 auth surfaces
- 22-component `@dcos/ui` kit
- Bilingual EN/हिं — 138 strings, Groq auto-translation, instant toggle
- 3-tier government hierarchy: Field Officer → Dept Nodal → CM Cell
- Collapsible sidebar (80px ↔ 224px, localStorage persisted)
- Interactive GIS ward heatmap (MapLibre GL, CARTO, severity coloring)
- JanSetu chatbot (FAQ + Groq AI, bilingual, floating widget)
- WhatsApp intake — language selection, interactive menus, guided multi-step filing, status reports, Redis state
- Supabase Auth (ES256 JWKS) + anti-escalation (app_metadata roles)
- Demo citizen login — phone OTP bypass (OTP: `000000`)
- Privacy policy (DPDP Act 2023)
- CI/CD — GitHub Actions (lint, typecheck, 71 tests, build)

### Epic 1 — Citizen Experience
- DPDP Act 2023 consent checkbox (blocks submission, consent logged)
- Citizen legal rights shown at filing success (law + deadline + escalation path)
- SLA breach alert on `/track/[id]` with CPGRAMS + Lokayukta links
- Complaint cluster notification

### Epic 2 — Field Operations Intelligence
- Smart route planner — 1.2km geo-clustering, Google Maps deep-links, time-saved estimate
- Officer scorecard — resolution rate, CSAT, false-closure %, dept rank, A–F grade
- Full case file — audit trail + handoff trail for receiving officers
- Quality checklists — 23 steps across 6 categories; resolution blocked until complete
- Proof dedup — MD5 hash; reusing another case's photo rejected 409

### Epic 3 — Contractor Accountability & Budget Intelligence
- Contract database (CRUD, ward coverage, type, value, dates, status)
- Auto-correlation engine — baseline vs post-work complaint rate (weekly cron)
- Contractor flagging — spike >150% flagged (India's first public contractor accountability system)
- Public contractor scorecard at `/transparency/contractors` + CSV export
- Budget intelligence — budget allocation → ROI grade A–F per department
- 272 Delhi MCD ward councillors from 2022 elections (party, constituency, term)
- WPI-by-party comparison on `/transparency/wards`
- Party filter + councillor name on ward index

---

## 🔵 Epic 4 — Predictive Governance & Policy Simulation *(next)*

The system tells the CM what will fail in 30 days before it fails — with economic ROI to act vs ignore.

- **E4.1** ML complaint volume predictor (time-series, ward × category, 30-day horizon)
- **E4.2** Officer burnout prediction (open load + breach rate + CSAT trend)
- **E4.3** Pre-emptive citizen alerts ("Waterlogging likely in Rohini in 18 days")
- **E4.4** Policy simulator — "Move ₹50Cr from road patching to drainage → net ₹3.4Cr/day gain"
- **E4.5** Early warning system on CM dashboard

## 🔵 Epic 5 — Open Government Platform

- **E5.1** Open API for third-party integration (documented, rate-limited, key-managed)
- **E5.2** CPGRAMS data bridge — auto-sync Delhi grievances to national portal
- **E5.3** Multi-city architecture — abstract Delhi-specific to configurable city model
- **E5.4** Annual report PDF auto-generation (governance report card)
- **E5.5** Full DPDP compliance audit + data-erasure endpoint

---

## 🔴 Must-do before government deployment

### 1. Upgrade Render → Starter ($7/mo) + enable Arq worker
**#1 blocker.** Free tier sleeps after 15 min — AI classification worker is NOT running in prod.
Every complaint stays at `RECEIVED` without it. Add Background Worker service:
- Root: `apps/api` · Start: `arq app.worker.WorkerSettings`

### 2. Enable phone OTP for citizen login
Supabase → Authentication → Providers → **Phone** → connect Twilio or MSG91.
Until then: citizens use the demo bypass (OTP `000000`).

### 3. Create real officer accounts
Only 3 demo accounts exist. Use the admin API:
```bash
GET https://jansetu-api.onrender.com/api/v1/identity/departments  # get dept UUIDs
```

### 4. Rotate all credentials shared in this session
- Supabase DB password → [Supabase → Database → Reset](https://supabase.com/dashboard/project/nggbydarhctzacxzivyw/settings/database)
- Groq API key → [console.groq.com/keys](https://console.groq.com/keys)
- WhatsApp token + App Secret → regenerate in Meta Developer Console
- Vercel deploy hook → regenerate in Vercel project settings

### 5. Add production domain to CORS
Currently: `["https://dcos-ecru.vercel.app"]`
Any new domain must be added to `CORS_ORIGINS` on Render.

---

## 🟡 High-value — not yet built

### Before/after proof gallery on /track/[id]
`attachments[]` with `is_proof` flag already returned by the API. Render proof photos when `status === 'RESOLVED'`. ~1 hour.

### MSG91 SMS notifications
Code exists, no credentials. Register at msg91.com → DLT template → set `MSG91_API_KEY`, `MSG91_TEMPLATE_ID_STATUS` on Render.

### WhatsApp — go Live on Meta (lift sandbox limits)
Currently only test numbers. Meta App → App Review → Go Live. Requires: Privacy Policy ✅ + Business Verification.

### Realtime push on CM dashboard
Currently polling every 30s. Wire Supabase Realtime for instant KPI push.

### IVR voice intake
Stub exists in `intake/router.py`. Wire Exotel or Twilio voice webhook for feature phones.

### Real contractor seed data
Current contractors scorecard is empty (no contracts entered yet). Enter the first real MCD contracts manually at `/cm/contractors`.

---

## 🟢 Government deployment checklist

- [ ] Render Starter → add Arq worker
- [ ] Custom domain `jansetu.delhi.gov.in` → Vercel Settings → Domains
- [ ] Add custom domain to `CORS_ORIGINS` on Render
- [ ] Object storage → Supabase Storage or Cloudflare R2 (MinIO is local-only stub)
- [ ] `SENTRY_DSN` → sentry.io for error tracking
- [ ] Load test (k6): 50k grievances/day, 2k concurrent dashboard users
- [ ] Third-party pen-test
- [ ] WCAG 2.1 AA accessibility audit
- [ ] MCD dept adapter — wire `IntegrationService.RestAdapter` to MCD portal API
- [ ] WhatsApp Business verification to lift sandbox limits
- [ ] Rotate all credentials (see #4 above)

---

## Local dev

```bash
cd infra && docker compose up -d           # Postgres + Redis + MinIO
cd apps/api && source .venv/bin/activate
python main.py &                            # API  → http://localhost:8000/docs
arq app.worker.WorkerSettings &            # Worker (AI + SLA + notifications + contractor)
cd ../.. && pnpm --filter web dev           # Web  → http://localhost:3000
```

**Dashboards empty?** Docker stopped → `cd infra && docker compose up -d` → restart API.
See [CONTEXT.md](CONTEXT.md) for the full file map and every architecture decision.
