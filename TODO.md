# DCOS — What's Left

> Current state: Epics 1–10 complete + full GovTech frontend + Supabase auth live.
> The backend and AI pipeline are production-ready. Items below are what remains
> before this can go live for real Delhi citizens.

---

## 🔴 Must-do before real users

### 1. Provision officers (Supabase admin API)
Roles come from **`app_metadata`** (not user_metadata — that's user-editable). Create officers like this:

```bash
curl -X POST "https://nggbydarhctzacxzivyw.supabase.co/auth/v1/admin/users" \
  -H "apikey: <SERVICE_KEY>" -H "Authorization: Bearer <SERVICE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "officer@delhi.gov.in",
    "password": "SecurePass123!",
    "email_confirm": true,
    "app_metadata": { "dcos_role": "field_officer", "department_id": "<dept-uuid>" },
    "user_metadata": { "name": "Officer Name" }
  }'
```

Available roles: `citizen` · `field_officer` · `dept_admin` · `district_officer` · `cm_cell` · `super_admin`

Get department UUIDs from: `GET /api/v1/identity/departments`

### 2. Enable phone OTP for citizen login
In Supabase Dashboard → Authentication → Providers → **Phone** → enable.
Then connect an SMS provider (Twilio recommended for India; MSG91 also works).
Until this is done, citizens must file anonymously (still works) or use email.

### 3. Real WhatsApp intake
- Create a Meta App → WhatsApp Business product → get a phone number
- Set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` in production env
- Register webhook: `POST /api/v1/intake/webhooks/whatsapp`
  Verify token: `dcos-whatsapp-verify` (set `WHATSAPP_VERIFY_TOKEN` to match)
- Set `FEATURE_WHATSAPP_INTAKE=true`

### 4. MSG91 SMS notifications
- Register at msg91.com → create a template for status updates
- Set `MSG91_API_KEY` + `MSG91_TEMPLATE_ID_STATUS`

---

## 🟡 High-value features not yet built

### 5. GIS interactive heatmap
**What it is:** The `/cm/map` and `/transparency/map` pages show a placeholder. MapLibre GL
is already installed; the ward GeoJSON and hotspot data are available from the API.

**To build:**
- Wire MapLibre in `apps/web/src/components/GisMap.tsx` (client component)
- Load ward boundaries from `GET /api/v1/analytics/hotspots?limit=500`
- Color each ward by `severity` (red/amber/green) and show popup on click
- Use dark basemap (`https://demotiles.maplibre.org/style.json`) for the CM surface,
  light for transparency

**Data shape already ready:**
```ts
{ ward_id, ward_name, lat, lng, open, total, sla_breaches, severity: "high"|"medium"|"low" }
```

### 6. Citizen sign-up with real phone (depends on #2 above)
Currently the `/signup` page sends an OTP via Supabase. Works the moment phone auth is enabled.

### 7. Before/after proof gallery on tracking page
Show the proof photos an officer uploaded on the citizen's `/track/[id]` page once resolved.
API: `GET /api/v1/intake/track/{id}` already returns `attachments[]` with `is_proof` flag.

### 8. Real-time KPI updates (Supabase Realtime)
The CM dashboard polls every 30s. Wire Supabase Realtime so state changes push instantly.
The `notifications` and `outbox_events` tables can broadcast.

---

## 🟢 Deploy checklist (when ready)

### Frontend → Vercel
1. `vercel --cwd apps/web` (or connect GitHub repo in Vercel dashboard)
2. Set env vars in Vercel:
   - `NEXT_PUBLIC_API_URL` = your deployed API URL
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://nggbydarhctzacxzivyw.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon key from Supabase dashboard)
3. Set `outputFileTracingRoot` in `next.config.js` to silence the monorepo lockfile warning

### Backend API + Worker → Render / Cloud Run / Fly.io
1. `ENVIRONMENT=production` → disables `/identity/token` and `/docs` endpoints
2. Provision a managed Postgres with PostGIS + pgvector enabled
   (Supabase Postgres works — enable extensions in SQL editor first)
3. Run `alembic upgrade head` against production DB
4. Run `python -m scripts.seed` (optional — for demo data)
5. Deploy the Docker image (`apps/api/Dockerfile`)
6. Start the worker separately: `arq app.worker.WorkerSettings`

### Production env vars needed (API)
```
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://...  (production DB)
REDIS_URL=redis://...
SUPABASE_URL=https://nggbydarhctzacxzivyw.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
AI_PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
CORS_ORIGINS=["https://your-vercel-domain.vercel.app"]
FEATURE_AI_CLASSIFY=true
FEATURE_ANALYTICS_NL_QUERY=true
FEATURE_WHATSAPP_INTAKE=true  # once WhatsApp is set up
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
MSG91_API_KEY=...
VAPID_PUBLIC_KEY=BCvKr4yKyKp1eUnbUY9d-GM3zIBAOqdMHZGqHbB_dOewThvBRfQqXcAWi3KJYaIWihyMbHKhnWmZz8RNTz9GYls
VAPID_PRIVATE_KEY=SibxQWmAkGI_9htoYRyrX_85JVfquyYeTpRKF45G4IA
SENTRY_DSN=...  # from sentry.io
```

### CORS
Add your production frontend domain to `CORS_ORIGINS`.

---

## 🔵 Polish / nice-to-have

### 9. Accessibility (WCAG 2.1 AA)
- Screen reader labels on icon-only buttons (topbar, sidebar)
- Keyboard navigation for dropdowns
- Focus ring visible on all interactive elements (already has `focus-visible` but needs audit)
- Low-bandwidth / low-literacy mode for citizens

### 10. DPDP Act 2023 compliance
- Consent capture on `/signup` and `/file`
- Data-subject erasure endpoint (delete all PII for a user)
- Retention policy enforcement (auto-delete after N months)
- Privacy notice page

### 11. Pen-test & hardening
- SQL injection scan (all user inputs go through parameterized queries — should be clean)
- Rate limiting in staging/production (currently skipped in `local` env)
- Security headers audit (X-Frame-Options etc. already added)
- Dependency scan (`pnpm audit` + `pip-audit`)

### 12. Load test
- Target: 50,000 grievances/day, 2,000 concurrent dashboard users
- Tool: k6 or Locust
- Hot paths: `POST /intake/grievances`, `GET /analytics/kpis`
- Tune: HNSW index, materialized view refresh interval, DB pool size

### 13. IVR (phone filing)
IVR stub exists in the intake router. Wire Exotel/Twilio voice webhook for citizens
without smartphones.

### 14. Department adapters (Epic 10 integration module)
The `RestAdapter` and `IntegrationService` framework exists.
Wire the first real department (MCD) via their portal API or email bridge.

---

## Local dev quick-start

```bash
# 1. Start Docker infra
cd infra && docker compose up -d

# 2. API
cd apps/api && source .venv/bin/activate && python main.py

# 3. Worker (AI + notifications)
arq app.worker.WorkerSettings

# 4. Frontend
cd ../.. && pnpm --filter web dev
```

If dashboards are empty → Postgres is down. Check `docker compose ps` and restart.
See CONTEXT.md for the full architecture reference.
