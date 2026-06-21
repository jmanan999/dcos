# JanSetu — Roadmap & What's Left

> **State as of 2026-06-21**
> All 10 backend epics ✅ · Modern GovTech frontend ✅ · Bilingual EN/हिं ✅
> GIS heatmap ✅ · WhatsApp (interactive, bilingual, Redis state) ✅
> JanSetu chatbot ✅ · Supabase auth live ✅ · Deployed Vercel + Render ✅
>
> **Live:** https://dcos-ecru.vercel.app · API: https://dcos.onrender.com

---

## ✅ Completed

- All 10 backend epics (intake → AI → routing → SLA → officer → citizen → analytics → hardening)
- Modern GovTech design system + 22-component `@dcos/ui` kit
- 23 frontend routes across citizen / officer / CM / transparency surfaces
- Bilingual EN/हिं — 138 strings, Groq auto-translation, header toggle
- Interactive GIS ward heatmap (MapLibre GL, CARTO, severity coloring)
- JanSetu chatbot (FAQ + Groq AI, bilingual, floating widget)
- WhatsApp intake — language selection, interactive menus, guided multi-step filing, status tracking, personal reports, Redis state machine
- Supabase Auth (ES256 JWKS) + anti-escalation (app_metadata roles)
- Privacy policy page (DPDP Act 2023 compliant)
- CI/CD — GitHub Actions (71 tests, all green)

---

## 🔴 Must-do before government deployment

### 1. Upgrade Render → Starter ($7/mo) + Arq worker
**The #1 blocker.** Free tier sleeps after 15 min — AI classification worker is NOT running.
Every complaint stays at `RECEIVED` forever.

Add a second Render **Background Worker** service:
- Root directory: `apps/api`
- Start command: `arq app.worker.WorkerSettings`
- Same env vars as the web service

### 2. Enable phone OTP for citizen login
Supabase → Authentication → Providers → **Phone** → enable → connect Twilio or MSG91.
Until then: citizens file anonymously (works) or use email signup.

### 3. Create real officer accounts
Only 3 demo accounts exist. Use the admin API (see README):
```bash
GET https://dcos.onrender.com/api/v1/identity/departments  # get dept UUIDs first
```

### 4. Rotate all credentials shared in this chat session
- Supabase DB password → [Supabase → Database → Reset](https://supabase.com/dashboard/project/nggbydarhctzacxzivyw/settings/database)
- Groq API key → [console.groq.com/keys](https://console.groq.com/keys)
- WhatsApp token + App Secret → regenerate in Meta Developer Console
- OpenRouter key → [openrouter.ai/keys](https://openrouter.ai/keys)

### 5. Update CORS when adding custom domain
Currently: `["https://dcos-delhi.vercel.app","https://dcos-ecru.vercel.app"]`
Any new domain must be added to `CORS_ORIGINS` on Render.

---

## 🟡 High-value features not yet built

### 6. Before/after proof gallery on /track/[id]
`attachments[]` with `is_proof` flag already returned by the API.
Render proof photos when `status === 'RESOLVED'`. ~1 hour of work.

### 7. MSG91 SMS notifications
Code exists, no credentials set. Register at msg91.com → DLT template → set on Render:
`MSG91_API_KEY`, `MSG91_TEMPLATE_ID_STATUS`

### 8. WhatsApp — go Live on Meta (lift sandbox limits)
Currently only test numbers can message the bot.
1. Meta App → App Review → Go Live
2. Privacy Policy URL ✅ → https://dcos-ecru.vercel.app/privacy
3. Complete Business Verification on Meta

### 9. Supabase Realtime on CM dashboard
Currently polls every 30s. Wire Realtime for instant KPI push when complaints change.

### 10. IVR voice intake
Stub exists in `intake/router.py`. Wire Exotel or Twilio voice webhook for feature phones.

---

## 🟢 Government deployment checklist

- [ ] Render Starter upgrade → add Arq worker (#1 above)
- [ ] Custom domain `jansetu.delhi.gov.in` → Vercel → Settings → Domains
- [ ] Add custom domain to `CORS_ORIGINS` on Render
- [ ] Object storage → Supabase Storage or Cloudflare R2 (currently MinIO stub)
- [ ] `SENTRY_DSN` → [sentry.io](https://sentry.io) for error tracking
- [ ] Load test (k6): 50k grievances/day, 2k concurrent dashboard users
- [ ] Third-party pen-test → fix findings before citizen launch
- [ ] DPDP Act 2023: consent capture on `/signup` + `/file`, data-erasure endpoint
- [ ] WCAG 2.1 AA accessibility audit
- [ ] MCD dept adapter: wire `IntegrationService.RestAdapter` to MCD portal API
- [ ] WhatsApp Business verification (Meta) to lift sandbox limits

---

## 🔵 Polish

- WhatsApp: download + store media when citizens send photos
- Translate landing page feature cards to Hindi (currently hardcoded English)
- PWA icons + service worker for install prompt
- Officer queue pagination (fine up to ~200 complaints)
- Email notification fallback for citizens without WhatsApp

---

## Local dev

```bash
cd infra && docker compose up -d           # Postgres + Redis + MinIO
cd apps/api && source .venv/bin/activate
python main.py &                            # API  → http://localhost:8000/docs
arq app.worker.WorkerSettings &             # Worker (AI + SLA + notifications)
cd ../.. && pnpm --filter web dev           # Web  → http://localhost:3000
```

**Dashboards empty?** Docker stopped → `cd infra && docker compose up -d` → restart API.
See [CONTEXT.md](CONTEXT.md) for the full file map and every architecture decision.
