# DCOS — What's Left

> **Current state (as of 2026-06-21):**
> Epics 1–10 complete · Modern GovTech frontend · Supabase auth live · Deployed on Vercel + Render
>
> **Live URLs:**
> - Frontend: https://dcos-ecru.vercel.app (alias: https://dcos-delhi.vercel.app)
> - API: https://dcos.onrender.com
> - GitHub: https://github.com/jmanan999/dcos
>
> **Demo accounts (production Supabase):**
> - `cm@delhi.gov.in` / `Dcos2026Admin!` → CM Cell (full command center)
> - `admin@mcd.gov.in` / `Dcos2026Admin!` → MCD Admin
> - `officer@mcd.gov.in` / `Dcos2026Field!` → MCD Field Officer

---

## ✅ Done

- [x] All 10 backend epics (intake, AI, routing, SLA, officer, citizen, analytics, reporting, hardening)
- [x] Modern GovTech design system (semantic tokens, 22-component kit, AppShell)
- [x] Landing page, login/signup, citizen portal, transparency dashboard
- [x] Officer console (queue, proof gate, team)
- [x] CM command center (KPIs, trend chart, hotspots, leaderboard, NL copilot, reports)
- [x] Supabase Auth (ES256 JWKS) + local-JWT dev fallback
- [x] Role-based access control with anti-escalation (app_metadata)
- [x] AI classification via Groq (Llama 3.3 70B, ~1.4s per complaint)
- [x] Production DB (Supabase Postgres, 540 seed grievances, 12 depts, 272 wards)
- [x] Redis (Upstash), VAPID web push keys generated
- [x] Vercel deployment (frontend) + Render deployment (API)
- [x] CI/CD via GitHub Actions (lint, typecheck, tests, build — all green)
- [x] Open-source README with badges, live demo, architecture diagram

---

## 🔴 Must-do before real Delhi citizens

### 1. Arq worker on Render (AI classification is disabled on free tier)
Render free tier sleeps after 15 min — the background worker (AI classify, SLA, notifications)
is not running. Upgrade to **Starter ($7/mo)** and add a second service:
- Type: Background Worker
- Root directory: `apps/api`
- Start command: `arq app.worker.WorkerSettings`
- Same env vars as the web service
- **Without this:** complaints file but don't auto-classify, route, or notify.

### 2. Enable phone OTP for citizen login
Supabase Dashboard → Authentication → Providers → **Phone** → enable.
Connect Twilio (recommended) or MSG91 as the SMS provider.
Until then: citizens file anonymously (works fine) or use email signup.

### 3. Add more officers to Supabase
Currently only 3 demo accounts exist (cm/mcd-admin/mcd-officer).
Create real officer accounts using the admin API (see README → "Provision officers"):
```bash
curl -X POST "https://nggbydarhctzacxzivyw.supabase.co/auth/v1/admin/users" \
  -H "apikey: <SERVICE_KEY>" -H "Authorization: Bearer <SERVICE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "officer@delhi.gov.in", "password": "...",
        "email_confirm": true,
        "app_metadata": { "dcos_role": "field_officer", "department_id": "<uuid>" },
        "user_metadata": { "name": "Name" } }'
```
Get department UUIDs: `GET https://dcos.onrender.com/api/v1/identity/departments`

### 4. CORS — add any new domains to Render env var
Currently `CORS_ORIGINS=["https://dcos-delhi.vercel.app","https://dcos-ecru.vercel.app"]`.
If you add a custom domain, add it here too or API calls will be blocked silently.

### 5. Rotate all credentials shared in chat
These were shared in this conversation and should be rotated before production traffic:
- Supabase DB password → [Settings → Database → Reset password](https://supabase.com/dashboard/project/nggbydarhctzacxzivyw/settings/database)
- Groq API key → [console.groq.com/keys](https://console.groq.com/keys)
- OpenRouter key → [openrouter.ai/keys](https://openrouter.ai/keys)
- Gemini key → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

---

## 🟡 High-value features not yet built

### 6. GIS interactive heatmap
The `/cm/map` and `/transparency/map` pages show a styled placeholder. MapLibre GL is installed
and ward centroid data (`lat`, `lng`, `severity`) is already coming from the API.

**To build:** `apps/web/src/components/GisMap.tsx` (client component) that:
- Loads `GET /api/v1/analytics/hotspots?limit=500`
- Colors each ward point by `severity` (red/amber/green)
- Shows popup on click with ward name + open count

### 7. WhatsApp intake channel
- Meta Developer Console → create App → WhatsApp product → get phone number
- Set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` on Render
- Register webhook URL: `POST https://dcos.onrender.com/api/v1/intake/webhooks/whatsapp`
  (verify token: `dcos-whatsapp-verify`)
- Set `FEATURE_WHATSAPP_INTAKE=true` on Render

### 8. MSG91 SMS notifications
Citizen status updates currently send but no-op (no key set).
- Register at msg91.com → create a DLT-approved template
- Set `MSG91_API_KEY` + `MSG91_TEMPLATE_ID_STATUS` on Render

### 9. Before/after proof gallery on tracking page
`/track/[id]` already receives `attachments[]` with `is_proof` flag from the API.
Just render the proof photos when `status === 'RESOLVED'`.

### 10. Real-time dashboard updates (Supabase Realtime)
CM dashboard currently polls every 30s via SWR. Wire Supabase Realtime for instant push.

---

## 🟢 When upgrading to government deployment

- [ ] Upgrade Render to **Starter ($7/mo)** → enable worker service (#1 above)
- [ ] Add custom domain (e.g. `dcos.delhi.gov.in`) → Vercel Settings → Domains
- [ ] Move object storage from stub → Supabase Storage or Cloudflare R2
- [ ] Set `SENTRY_DSN` (error tracking) → [sentry.io](https://sentry.io)
- [ ] Run load test (k6 / Locust): target 50,000 grievances/day, 2,000 concurrent dashboard users
- [ ] Third-party pen-test → fix findings before launch
- [ ] DPDP Act 2023: consent capture on `/signup` + `/file`, data-erasure endpoint, privacy notice
- [ ] Accessibility audit (WCAG 2.1 AA): screen reader, keyboard nav, contrast
- [ ] IVR: wire Exotel/Twilio voice webhook to intake (stub already in router)
- [ ] MCD department adapter: wire `IntegrationService.RestAdapter` to MCD's portal API

---

## 🔵 Polish (nice-to-have)

- Feedback / reopen email notification (currently only WhatsApp/SMS)
- PWA install prompt for citizen portal (manifest.json exists, needs icons)
- Dark mode for CM command center (design tokens already support it)
- Pagination on officer queue (currently loads all, fine for demo)
- Stale-while-revalidate on CM analytics (currently shows skeleton on refetch)

---

## Local dev quick-start

```bash
cd infra && docker compose up -d          # Postgres + Redis + MinIO
cd apps/api && source .venv/bin/activate
python main.py &                           # API  → http://localhost:8000/docs
arq app.worker.WorkerSettings &            # Worker
cd ../.. && pnpm --filter web dev          # Web  → http://localhost:3000
```

**Dashboards empty?** Docker stopped → `docker compose up -d` → restart API.
See `CONTEXT.md` for the full file map and architecture reference.
