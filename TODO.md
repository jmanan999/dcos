# JanSetu — What's Left

> **Current state (as of 2026-06-21):**
> All 10 backend epics ✅ · Modern GovTech frontend ✅ · Bilingual EN/हिं ✅
> GIS heatmap ✅ · Supabase auth live ✅ · Deployed on Vercel + Render ✅
> Rebranded from DCOS → **JanSetu** · Tracking IDs now `JS-YYYYMMDD-XXXX`
>
> **Live:** https://dcos-ecru.vercel.app · API: https://dcos.onrender.com
> **GitHub:** https://github.com/jmanan999/dcos

---

## ✅ Done (since project start)

- All 10 backend epics (intake → AI → routing → SLA → officer → citizen → analytics → hardening)
- Modern GovTech design system + 22-component `@dcos/ui` kit
- 23 frontend routes across 4 surfaces (citizen, officer, CM, transparency)
- Bilingual EN/हिं with Groq auto-translation (138 strings, `translate.mjs` script)
- Interactive GIS ward heatmap (MapLibre GL, CARTO basemaps, no API key)
- Supabase Auth (ES256 JWKS) + anti-escalation (app_metadata roles)
- Groq AI pipeline (Llama 3.3 70B, ~1.4s per complaint)
- Production DB seeded (540 grievances, 12 depts, 272 wards, 11 districts)
- CI/CD — GitHub Actions (70 tests, all green)
- Open-source README, MIT LICENSE, CONTEXT.md, TODO.md

---

## 🔴 Must-do before real Delhi citizens

### 1. Upgrade Render → Starter ($7/mo) + add Arq worker
**This is the #1 blocker.** Render free tier sleeps after 15 min. The Arq worker
(AI classify, SLA escalation, notifications) is NOT running in production right now.
Every complaint filed on the live site stays at `RECEIVED` forever.

On Render → New Service → Background Worker:
- Root directory: `apps/api`
- Start command: `arq app.worker.WorkerSettings`
- Same env vars as the web service

### 2. Enable phone OTP for citizen login
Supabase → Authentication → Providers → **Phone** → enable.
Connect Twilio (recommended for India) or MSG91.
Until then: citizens file anonymously (works) or use email.

### 3. Create real officer accounts (Supabase admin API)
Only 3 demo accounts exist. Real departments need accounts.
Roles come from `app_metadata` — only settable via service key:
```bash
curl -X POST "https://nggbydarhctzacxzivyw.supabase.co/auth/v1/admin/users" \
  -H "apikey: <SERVICE_KEY>" -H "Authorization: Bearer <SERVICE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "officer@delhi.gov.in", "password": "...", "email_confirm": true,
        "app_metadata": { "dcos_role": "field_officer", "department_id": "<uuid>" },
        "user_metadata": { "name": "Name" } }'
```
Get dept UUIDs: `GET https://dcos.onrender.com/api/v1/identity/departments`

### 4. Rotate all credentials shared in chat
- Supabase DB password → [Settings → Database](https://supabase.com/dashboard/project/nggbydarhctzacxzivyw/settings/database) → Reset
- Groq API key → [console.groq.com/keys](https://console.groq.com/keys)
- OpenRouter key → [openrouter.ai/keys](https://openrouter.ai/keys)
- Gemini key → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 5. Add custom domain to CORS_ORIGINS
Currently: `["https://dcos-delhi.vercel.app","https://dcos-ecru.vercel.app"]`.
Any new domain (e.g. `jansetu.delhi.gov.in`) must be added to `CORS_ORIGINS` on Render
or API calls will be silently blocked.

---

## 🟡 High-value features not yet built

### 6. WhatsApp intake channel — ✅ DONE
Code is complete + tested. Need to complete Meta setup:

**Step 1 — Create Meta App:**
1. Go to https://developers.facebook.com → My Apps → Create App
2. Choose **Business** type → name it "JanSetu"
3. Add **WhatsApp** product → click Set Up
4. Under WhatsApp → API Setup, note your **Phone Number ID** and generate a **Permanent Token**
5. Under App Settings → Basic, copy the **App Secret**

**Step 2 — Set env vars on Render:**
```
WHATSAPP_APP_SECRET=<from Meta App Settings → Basic>
WHATSAPP_TOKEN=<permanent access token>
WHATSAPP_PHONE_NUMBER_ID=<from WhatsApp API Setup>
WHATSAPP_VERIFY_TOKEN=jansetu-whatsapp-verify
FEATURE_WHATSAPP_INTAKE=true
```

**Step 3 — Register webhook on Meta:**
- Webhook URL: `https://dcos.onrender.com/api/v1/intake/webhooks/whatsapp`
- Verify Token: `jansetu-whatsapp-verify`
- Subscribe to: `messages` field

**What already works once creds are set:**
- Text messages → filed as grievances in Hindi
- Images/audio/video → caption extracted
- Location pin → lat/lng captured
- Auto-reply with tracking ID (JanSetu branded)
- Emergency keyword detection
- Idempotency (duplicate messages ignored)
- Signature verification (App Secret based, not token)

### 7. MSG91 SMS notifications
Status updates currently no-op (code exists, no key):
- Register at msg91.com → create a DLT-approved template
- Set on Render: `MSG91_API_KEY`, `MSG91_TEMPLATE_ID_STATUS`

### 8. Before/after proof gallery on tracking page
`/track/[id]` already receives `attachments[]` with `is_proof` flag from the API.
Just render proof photos when `status === 'RESOLVED'`. ~1 hour of work.

### 9. Supabase Realtime on CM dashboard
Currently polls every 30s. Wire Realtime for instant KPI push when complaints
change status. Reduces dashboard latency from 30s → < 1s.

---

## 🟢 Government deployment checklist

- [ ] Upgrade Render to Starter ($7/mo) → add Arq worker (#1 above)
- [ ] Add custom domain `jansetu.delhi.gov.in` → Vercel → Settings → Domains
- [ ] Update `CORS_ORIGINS` on Render with the new domain
- [ ] Move object storage → Supabase Storage or Cloudflare R2 (currently MinIO stub)
- [ ] Set `SENTRY_DSN` on Render → [sentry.io](https://sentry.io) new FastAPI project
- [ ] Load test: k6 targeting 50,000 grievances/day, 2,000 concurrent dashboard users
- [ ] Third-party pen-test → fix findings
- [ ] DPDP Act 2023: consent capture on `/signup` + `/file`, data-erasure endpoint, privacy notice page
- [ ] Accessibility audit (WCAG 2.1 AA): screen reader, keyboard nav, contrast
- [ ] IVR: wire Exotel/Twilio voice webhook to intake stub in `intake/router.py`
- [ ] MCD adapter: wire `IntegrationService.RestAdapter` to MCD's portal API

---

## 🔵 Polish (nice-to-have)

- Translate feature/transparency card labels in Hindi (currently hardcoded English in `(marketing)/page.tsx`)
- PWA install prompt (manifest.json exists, needs icons + service worker)
- Pagination on officer queue (currently loads all — fine up to ~200)
- Before/after proof gallery on `/track/[id]` (#8 above)
- Email notification fallback for citizens without WhatsApp

---

## Local dev

```bash
cd infra && docker compose up -d          # Postgres + Redis + MinIO
cd apps/api && source .venv/bin/activate
python main.py &                           # API  → http://localhost:8000/docs
arq app.worker.WorkerSettings &            # Worker (AI + SLA + notifications)
cd ../.. && pnpm --filter web dev          # Web  → http://localhost:3000
```

**Dashboards empty?** Docker stopped → `docker compose up -d` → restart API.  
See `CONTEXT.md` for full file map and architecture reference.
