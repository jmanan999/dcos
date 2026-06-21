# JanSetu — 5 Execution Epics
## From Complaint Box to Governance OS

---

> **The mission in one sentence:**
> Build the world's first system where a Delhi citizen gets their pothole fixed in 7 days,
> a Chief Minister can see which ward's governance is failing and why it costs ₹4.2 crore/day,
> and a voter can see their councillor's actual performance score before every election —
> all automatically, in real time, in their language, with zero political spin.

> **Why this matters beyond Delhi:**
> India's 32 crore urban citizens currently live in a governance black box.
> They pay taxes. Infrastructure fails. Nobody is accountable.
> JanSetu is the system that ends that — and the model every Indian city will follow.

---

## Epic 1 — The Citizen Experience Revolution
### *"From 40 minutes of confusion to 45 seconds of certainty — for every Delhi citizen, regardless of literacy or language"*

**The problem we're solving:**
A vegetable vendor in Rohini today spends 40+ minutes navigating English government websites to report a broken streetlight, gets no updates, and gives up. A college student files in 90 seconds but then faces 11 days of silence with no idea if anyone acted. Both experiences are failures. The first fails the citizen. The second fails the government. World-class citizen experience means: ANY citizen files in under 60 seconds, knows exactly what will happen and when, and gets proactively told when it does.

**What "done" looks like:**
- Voice message in Hindi on WhatsApp → filed in 45 seconds
- Immediate response tells citizen: "Under Delhi law, this must be fixed in 7 days"
- WhatsApp message when officer is assigned (with name and department)
- WhatsApp message when officer starts field work
- WhatsApp message when resolved: "Was it fixed? YES or NO?"
- DPDP-compliant consent at filing
- Complaint clustering: "You're 1 of 9 citizens reporting this — it's been escalated"
- Anonymous-but-trackable filing for those who fear retaliation

---

### Epic 1 Execution Plan

#### E1.1 — Rights Information at Filing (Frontend) ✅ Backend done
**What:** When a citizen files a complaint, the success screen + the /file form itself must show their legal rights — which law requires resolution in how many days.
**Backend:** API now returns `citizen_right` in GrievanceCreateResponse.
**Frontend todo:**
- In `/file/page.tsx` success screen: show `result.citizen_right` as a prominent card
- Format: "Under [law], [department] must resolve this within [X] days. You can escalate after Day [X+1]."
- Link to `/track/[id]/escalate` option after SLA breach
- Show the same rights info during Step 1 (after category detected, before submission)

**Files to change:**
- `apps/web/src/app/(citizen)/file/page.tsx` — success screen + pre-submission step

---

#### E1.2 — DPDP Act 2023 Compliance
**What:** Digital Personal Data Protection Act 2023 requires explicit consent at data collection. Non-compliance: up to ₹250 crore penalty (2027 deadline). Must implement now.
**What to build:**
- Consent checkbox at filing: "I consent to sharing my phone number and location with relevant government departments for complaint resolution."
- "Learn more" modal explaining what data is collected, why, and for how long
- `/privacy` page update: add "Your Rights" section with data access and deletion info
- "Download my data" button on `/my-complaints` page (GET /identity/me data export)
- "Delete my account" flow (soft delete with 30-day grace period)

**Files to change:**
- `apps/web/src/app/(citizen)/file/page.tsx` — consent at step 3 (review step)
- `apps/web/src/app/(marketing)/privacy/page.tsx` — Your Rights section
- `apps/web/src/app/(citizen)/my-complaints/page.tsx` — Download data button

---

#### E1.3 — Cluster Notification to Citizen
**What:** When a complaint is filed and its ward + category already has 5+ other open complaints, tell the citizen immediately: "You are 1 of N citizens who reported this. This cluster has been escalated as a priority case."
**Backend todo:**
- In `intake/service.py → create_grievance()`: after ward detection, count open complaints in same ward × category
- Return `cluster_size` and `cluster_escalated` bool in `GrievanceCreateResponse`
**Frontend todo:**
- In file success screen: if `cluster_size >= 5`, show: "You're complaint #[N] on this issue in [Ward]. It's being treated as a cluster case."

**Files to change:**
- `apps/api/app/modules/intake/service.py` — cluster count query
- `apps/api/app/modules/intake/schemas.py` — add cluster_size field
- `apps/web/src/app/(citizen)/file/page.tsx` — success screen cluster message

---

#### E1.4 — Track Page: SLA Breach Alert + Escalation Prompt
**What:** When a citizen visits `/track/[id]` and the SLA deadline has passed, they should see a prominent alert with: days overdue, their legal right to escalate, and a button to escalate.
**Frontend todo:**
- In `track/[id]/page.tsx`: compute `is_overdue = sla_due_at < now()`
- If overdue: show red alert box with overdue days and escalation prompt
- "Under Delhi Right to Services Act 2011, you can escalate to First Appellate Authority."
- "File escalation online →" button (links to DARPG or Lokayukta — external)

**Files to change:**
- `apps/web/src/app/(citizen)/track/[id]/page.tsx` — SLA breach alert

---

#### E1.5 — Voice as Primary Input (Not Buried)
**What:** Currently voice recorder is buried in Step 1 after language selection. For 40% of Delhi who prefer voice, this should be the FIRST thing they see.
**Frontend todo:**
- Redesign Step 1: lead with a large voice record button ("बोलकर शिकायत करें / Record your complaint")
- WhatsApp-style voice message UI (hold to record, release to submit)
- Text input becomes secondary option: "Or type below"
- After transcription: show the transcribed text for citizen to review/edit

**Files to change:**
- `apps/web/src/app/(citizen)/file/page.tsx` — Step 1 voice-first redesign

---

#### E1.6 — Anonymous + Trackable (QR Code System)
**What:** Currently anonymous complaints have no follow-up mechanism. Citizens in sensitive areas (labor complaints, domestic situations) file anonymously but need to track.
**Backend todo:**
- When `is_anonymous=true`, generate a 16-character opaque token (not the tracking ID)
- Store: `anonymous_token` column on grievances
- New endpoint: `GET /intake/track-anon/{token}` — returns same tracking data as `/track/{id}` but requires no auth
**Frontend todo:**
- In file success screen (anonymous): show QR code encoding the anon-token URL
- "Screenshot or download this QR code — it's your only way to track this complaint"
- QR code: `https://dcos-ecru.vercel.app/track-anon/{token}`

**Files to change:**
- Migration: add `anonymous_token` column
- `apps/api/app/modules/intake/service.py` — generate token
- `apps/api/app/modules/intake/router.py` — new track-anon endpoint
- `apps/web/src/app/(citizen)/file/page.tsx` — QR code in success screen

---

### Epic 1 TODO List

```
[ ] E1.1a  File success screen: display citizen_right card from API response
[ ] E1.1b  File step 1: show rights banner after AI category detection (post-classify)
[ ] E1.2a  File step 3: DPDP consent checkbox (required before submit)
[ ] E1.2b  File step 3: "Learn more" modal on consent
[ ] E1.2c  Privacy page: add "Your Rights Under DPDP 2023" section
[ ] E1.2d  My-complaints page: "Download my data" button
[ ] E1.3a  Backend: cluster count in intake service + schema field
[ ] E1.3b  File success screen: cluster notification if cluster_size >= 5
[ ] E1.4   Track page: SLA breach alert with overdue days + escalation prompt
[ ] E1.5a  File step 1: voice button as primary (WhatsApp-style)
[ ] E1.5b  File step 1: text input as secondary option
[ ] E1.6a  DB migration: anonymous_token column
[ ] E1.6b  Backend: generate anonymous token, track-anon endpoint
[ ] E1.6c  File success: QR code for anonymous complaints
[ ] E1.X   Deploy + verify on live site
```

---

## Epic 2 — Field Operations Intelligence
### *"Transform 15,000 field officers from reactive fire-fighters into a precision-guided ground force — double their daily output, make false closures impossible"*

**The problem we're solving:**
Suresh Meena, PWD field officer, spends 40 minutes driving to a pothole, completes the repair in 90 minutes, then spends 90 more minutes fighting GPS errors and app crashes trying to file his proof. He resolves 3 complaints/day when he could do 6. The 500m GPS tolerance is simultaneously too strict (real-world GPS drift) and gameable (old photo from another site). There are no smart routes, no offline mode, no department checklists, and officers have no visibility into how they're performing.

**What "done" looks like:**
- Officer opens app: sees 14 complaints grouped into 4 geo-clusters with an optimized route
- Drives to cluster, taps "Start Route" → navigation opens
- Proof upload: video with continuous GPS + MD5 deduplication prevents re-use
- Department checklist enforces quality (pothole: material type, area measurement)
- Officer can see their own performance score: resolution rate, CSAT, breach rate
- Handoff shows receiving officer the FULL case file: photos, notes, location, history

---

### Epic 2 Execution Plan

#### E2.1 — Smart Route Optimization
**What:** Group nearby complaints (within 1km radius) for same field visit. Show officer estimated total time vs. driving each separately.
**Backend todo:**
- New endpoint: `GET /workforce/route-plan?officer_id=X` 
- Algorithm: k-means clustering on lat/lng coordinates of officer's queue
- Returns: list of clusters (ward-name, complaints[], estimated_time_min, google_maps_url)
**Frontend todo:**
- In officer queue: above the table, "Route Plan" card showing 3-4 clusters
- Each cluster: ward name, complaint count, time estimate, "Open in Maps" button
- "Best route" generates a Google Maps URL with all stops in sequence

---

#### E2.2 — Officer Performance Score (Frontend)
**What:** Backend computes workload metrics. Officers currently have zero visibility into how they're doing vs. peers and vs. their own history.
**Frontend todo:**
- Officer dashboard: personal score card (resolution rate, CSAT, avg hours, breach count)
- Trend sparkline: "This week vs. last week"
- "Your rank in department: 7 of 45 officers"
- Dept admin view: side-by-side team comparison with ability to reassign from overloaded officers

---

#### E2.3 — Full Case File on Handoff
**What:** When a complaint is handed off to another department, the receiving officer currently only sees raw complaint text. They need the full history.
**Backend todo:**
- `GET /workforce/grievances/{id}/full-case` — returns: original text, attachments, all notes (incl. handoff reason), all status events, citizen's location
**Frontend todo:**
- Grievance detail page: add "Full History" tab showing complete audit trail
- In handoff confirmation dialog: preview of what the receiving officer will see
- On the receiving end (dept/queue assignment desk): "Previously attempted by" section

---

#### E2.4 — Department-Specific Checklists
**What:** Officers upload photos but nothing enforces quality or completeness. A pothole repair should require: material type, area, before/after, cure time. A streetlight: fault identified, component replaced.
**Backend todo:**
- New table: `complaint_checklists` (category → checklist items)
- `GET /workforce/checklists/{category}` — returns ordered list of required steps
- `POST /workforce/grievances/{id}/checklist` — mark items complete
**Frontend todo:**
- In grievance proof tab: if category has checklist, show it before proof upload
- Can't submit resolution until all checklist items are checked
- Checklist data stored and visible to supervisor

---

#### E2.5 — Proof Integrity (MD5 + Video)
**What:** Current photo proof is gameable (upload old photo of fixed road). Need MD5 hash deduplication and optional video for large projects.
**Backend todo:**
- On attachment upload: compute MD5 of file, store in `attachments.file_hash`
- Reject proof upload if same MD5 already exists in system (duplicate detection)
- For categories: "Road Repair Required", "Sewage Overflow", "Flyover / Bridge Damage" — require video proof
- Video: extract first-frame timestamp + GPS from video metadata (FFprobe)
**Frontend todo:**
- Proof tab: for large project categories, show "Video proof required" with record button
- Show duplicate detection message if hash matches existing proof

---

### Epic 2 TODO List

```
[ ] E2.1a  Backend: route-plan endpoint with geo-clustering algorithm
[ ] E2.1b  Frontend: Route Plan card on officer dashboard and queue page
[ ] E2.1c  Frontend: Google Maps deep-link with optimized stops
[ ] E2.2a  Frontend: Officer personal performance scorecard (own view)
[ ] E2.2b  Frontend: Department rank display on officer dashboard
[ ] E2.2c  Frontend: Team comparison view on dept/team page (already has data)
[ ] E2.3a  Backend: full-case endpoint returning complete grievance history
[ ] E2.3b  Frontend: Full History tab on grievance detail page
[ ] E2.3c  Frontend: Handoff dialog shows preview of what receiving officer sees
[ ] E2.4a  Backend: checklists table + seed with 6 category checklists
[ ] E2.4b  Backend: checklist item completion endpoint
[ ] E2.4c  Frontend: Checklist in proof tab, blocks resolution until complete
[ ] E2.5a  Backend: MD5 hash on attachment upload + duplicate rejection
[ ] E2.5b  Backend: video requirement flag by complaint category
[ ] E2.5c  Frontend: Video record button for flagged categories
[ ] E2.X   Deploy + test with demo officer account
```

---

## Epic 3 — Contractor Accountability & Budget Intelligence
### *"For the first time in India, link every rupee of government spending to what citizens actually experienced — and publish contractor failure rates publicly so bad work has real consequences"*

**The problem we're solving:**
India's L1 (lowest bidder) tendering system produces roads that fail in 3-5 years despite being designed for 15-20. The same contractors win contracts repeatedly with no consequence for past failures. ₹6,897 crore is spent annually by MCD Delhi with zero public accountability for whether it produced results. No Indian state has a public contractor performance database. We can build one — using complaint data as the accountability signal.

**What "done" looks like:**
- Admin enters contract: "Vijay Construction, Ward 42-49 roads, ₹42L, Jan 2026"
- System auto-tracks complaint rate in those wards before and after contract completion
- 6 months later: "+284% pothole complaints in those wards = contractor failure"
- Public scorecard at `/transparency/contractors`: every contractor ranked by post-work complaint rate
- Budget-outcome report: "₹150Cr spent on North Delhi roads → 23% reduction in road complaints → ₹28Cr/year economic recovery. ROI: 18.7% (Grade C)"

---

### Epic 3 Execution Plan

#### E3.1 — Contract Database (Admin Interface)
**What:** No contract data currently exists. Need an admin interface for entering tender/contract records.
**Backend todo:**
- Migration: new `contracts` table (contractor_name, gst, department, ward_ids[], type, value_lakh, start_date, end_date, tender_id)
- CRUD endpoints under `/identity/contracts` (super_admin + cm_cell role)
**Frontend todo:**
- New admin page at `/cm/contractors/new` — contract entry form
- Fields: contractor name, GST, department, ward selection (multi-select from ward list), type, value, dates
- Contract list at `/cm/contractors` with edit/delete

---

#### E3.2 — Auto-Correlation Engine
**What:** After a contract completion date, system auto-computes complaint rate in those wards before vs. after.
**Backend todo:**
- Scheduled job (weekly): for each completed contract, compute:
  - Baseline: avg complaints/week in ward×category for 90 days before `start_date`
  - Post-work: avg complaints/week in ward×category for 180 days after `end_date`
  - Spike %: `(post - baseline) / baseline × 100`
- Store result in `contract_performance` table
- Flag contractor if spike > 150% in relevant category

---

#### E3.3 — Public Contractor Scorecard
**What:** Public, no-auth page at `/transparency/contractors` ranking every contractor by post-work complaint rate.
**Frontend todo:**
- Table: Contractor | Projects | Avg spike % | Waste est. (₹L) | Flag (🟢/🟡/🔴)
- Filter: by department, by flag color
- Each contractor row: expandable to show individual contract performance
- Download CSV for journalists

---

#### E3.4 — Budget-Outcome Correlation Dashboard
**What:** Admin inputs quarterly budget allocation by department. System computes: did complaint volume change proportionally?
**Backend todo:**
- Migration: `budget_allocations` table (department, period, amount_crore)
- New analytics endpoint: `/analytics/budget-outcomes?dept=X&period=Y` 
  → complaints before/after, economic drag before/after, ROI estimate
**Frontend todo:**
- New `/cm/intelligence` page with budget-outcome panel
- Bar chart: budget allocated vs. complaint change % for each department
- "If you reallocated ₹20Cr from X to Y, projected impact: Z%"

---

#### E3.5 — MLA / Councillor Performance Linkage
**What:** Link each ward to its current MLA/councillor. Ward WPI score becomes the elected representative's accountability score.
**Backend todo:**
- Migration: `ward_representatives` table (ward_id, representative_name, party, constituency, term_start, term_end)
- Admin: simple CSV import for all 272 wards
- WardIntelligence schema: add `representative` field
**Frontend todo:**
- `/transparency/wards` page: show representative name next to ward
- Filter by party: "Show all AAP wards" / "Show all BJP wards"
- Historical comparison: WPI score when representative took office vs. today

---

### Epic 3 TODO List

```
[ ] E3.1a  Migration: contracts table
[ ] E3.1b  Backend: contract CRUD endpoints
[ ] E3.1c  Frontend: /cm/contractors contract entry form + list page
[ ] E3.2a  Backend: contract performance correlation algorithm
[ ] E3.2b  Backend: scheduled weekly correlation job
[ ] E3.2c  Backend: contractor_performance table + flagging logic
[ ] E3.3a  Frontend: /transparency/contractors public scorecard page
[ ] E3.3b  Frontend: CSV export for contractors page
[ ] E3.4a  Migration: budget_allocations table
[ ] E3.4b  Backend: /analytics/budget-outcomes endpoint
[ ] E3.4c  Frontend: /cm/intelligence budget-outcome panel
[ ] E3.5a  Migration: ward_representatives table
[ ] E3.5b  Backend: CSV import for 272 ward representatives
[ ] E3.5c  Frontend: /transparency/wards show representative + party filter
[ ] E3.X   Seed with Delhi 2024 ward councillor data (public record)
```

---

## Epic 4 — Predictive Governance & Policy Simulation
### *"Stop firefighting. Start governing. The system tells the CM what will fail in 30 days — before it fails — and what it costs to prevent it vs. ignore it"*

**The problem we're solving:**
Every government system in India is reactive. A pothole forms → citizen complains → officer fixes. This cycle costs 10x more than proactive maintenance. More critically, the same wards flood every monsoon, the same contractors fail every year, the same officers burn out under overload — and nobody sees it coming. A governance OS should predict problems before they occur and recommend interventions with ROI calculations.

**What "done" looks like:**
- June 1: "Rohini Zone waterlogging probability: 87% in 18 days. Pre-position 6 pump teams NOW. Cost: ₹4.2L. Economic loss if ignored: ₹28L/day for 4 days = ₹112L. ROI: 2,600%"
- Officer workload model: "Officer Suresh Meena's burnout risk is HIGH (23 open cases, 4 breaches, falling CSAT). Recommend: transfer 5 cases to Priya Sharma (6 cases, 0 breaches)"
- Policy simulator: "Move ₹50Cr from road patching to drainage → net gain ₹3.4Cr/day over 90 days. Approve?"

---

### Epic 4 Execution Plan

#### E4.1 — ML Complaint Volume Predictor
**What:** Time-series model predicting complaint spikes per ward × category in next 30 days.
**Backend todo:**
- Data pipeline: extract daily complaint counts by ward × category (last 90 days)
- Model: SARIMA or Prophet for seasonal patterns (monsoon, heat wave, festival traffic)
- Train: weekly retrain with new data
- Output: prediction endpoint `/analytics/predictions` (enhanced — currently uses simple 30/60 day comparison)
- Add seasonal boosters: if IMD weather forecast shows heavy rain in 7 days → boost waterlogging prediction by 2x

---

#### E4.2 — Officer Burnout Prediction
**What:** Officers with high caseloads + declining CSAT + rising breach rates are heading for burnout or gaming. Predict and intervene.
**Backend todo:**
- Score formula: `burnout_risk = open_cases×0.3 + breach_rate×0.4 + csat_decline×0.3`
- Threshold: score > 70 = HIGH risk
- Supervisor alert: POST to outbox → WhatsApp to nodal officer
- Weekly computation in cron job
**Frontend todo:**
- Dept/team page: burnout risk indicator next to officer name (green/amber/red)
- "Recommend rebalance" button: auto-suggests redistributing cases from high-risk officers

---

#### E4.3 — Policy Impact Simulator (Full)
**What:** CM can model: "If I move ₹50Cr from roads to drainage, what happens to complaint volume and economic drag?"
**Backend todo:**
- Enhanced simulator endpoint `/analytics/simulate` with:
  - Historical budget-complaint elasticity per department (computed from E3.4 data)
  - Forward projection for 90 days
  - Confidence intervals
  - "Best case / most likely / worst case" outputs
**Frontend todo:**
- New `/cm/simulate` page with:
  - Two-column: "Current allocation" vs. "Proposed allocation"
  - Sliders: adjust budget per department
  - Live projection: complaint change %, economic impact, ROI
  - "Submit for approval" button → creates a brief for Chief Secretary

---

#### E4.4 — Governance Early Warning System
**What:** Wards declining in WPI for 3+ consecutive weeks get flagged before they enter crisis (WPI < 30).
**Backend todo:**
- Store weekly WPI snapshots in `ward_wpi_history` table
- Detect declining trend: 3 consecutive weeks of WPI drop
- Severity: "watch" (declining), "warning" (WPI 30-40), "crisis" (WPI < 30)
- Alert mechanism: auto-brief item in governance scorecard
**Frontend todo:**
- CM intelligence dashboard: "Early Warning" section with ward trajectory arrows
- Click ward → see WPI trend chart for last 12 weeks

---

#### E4.5 — Pre-emptive Citizen Alerts (Monsoon / Seasonal)
**What:** Before monsoon, proactively WhatsApp citizens in at-risk wards: "Your ward has 87% waterlogging probability this monsoon. Steps to prevent damage: [practical tips]. File preemptively if drains are blocked: [link]"
**Backend todo:**
- Ward risk segmentation: identify top 30 at-risk wards per monsoon cycle
- Opt-in model: citizens who filed in those wards in past 6 months get the alert
- One-time annual alert per citizen per monsoon (not spam)
**Frontend todo:**
- `/cm/predict` page: trigger pre-emptive alerts for selected wards with confirmation

---

### Epic 4 TODO List

```
[ ] E4.1a  Backend: daily complaint aggregation pipeline (ward × category × day)
[ ] E4.1b  Backend: Prophet/SARIMA model training + weekly retrain cron job  
[ ] E4.1c  Backend: IMD weather API integration for seasonal boost
[ ] E4.1d  Frontend: Enhanced predictions page with confidence intervals
[ ] E4.2a  Backend: officer burnout score computation + weekly cron
[ ] E4.2b  Backend: supervisor alert outbox event on HIGH risk
[ ] E4.2c  Frontend: dept/team page burnout risk indicator + rebalance button
[ ] E4.3a  Backend: /analytics/simulate endpoint with elasticity model
[ ] E4.3b  Frontend: /cm/simulate policy simulator page with sliders
[ ] E4.3c  Frontend: "Submit for approval" → Chief Secretary brief generation
[ ] E4.4a  Backend: ward_wpi_history table + weekly snapshot cron
[ ] E4.4b  Backend: declining trend detection + early warning levels
[ ] E4.4c  Frontend: CM dashboard early warning section with trajectory arrows
[ ] E4.5a  Backend: at-risk ward segmentation for monsoon
[ ] E4.5b  Backend: pre-emptive citizen alert dispatch (opt-in, annual)
[ ] E4.5c  Frontend: /cm/predict alert trigger with ward selection
[ ] E4.X   Backfill historical WPI data to enable trend computation
```

---

## Epic 5 — Open Government Platform & India Scale
### *"JanSetu becomes infrastructure — the governance OS that every Indian city can run on, that researchers can study, that journalists can hold officials accountable with, and that proves performance-based politics is possible"*

**The problem we're solving:**
JanSetu as a single-city product is useful. JanSetu as a platform is transformational. The moment it works in Delhi, every Chief Minister of every Indian city wants it. The moment Ward Index is public, journalists build election accountability tools on top of it. The moment the API is open, researchers from IIT Delhi and World Bank study Indian governance using our data. This is how a government portal becomes a movement.

**What "done" looks like:**
- Open API: any registered researcher can query anonymized ward/department data
- CPGRAMS sync: complaints filed nationally that route to Delhi departments land in JanSetu automatically
- Mumbai instance: fork the codebase, configure for BMC's department structure, deploy in 2 weeks
- Annual Governance Report: auto-generated 30-page PDF for Delhi submitted to DARPG
- DPDP compliance: full data rights system, deletion flows, breach reporting

---

### Epic 5 Execution Plan

#### E5.1 — Open API with Authentication
**What:** Researchers, journalists, and NGOs can query anonymized ward/department data via REST API.
**Backend todo:**
- New `api_keys` table (user_id, key_hash, plan, daily_limit, org_name, purpose)
- API key issuance: POST /identity/api-keys (with org verification)
- Rate limiting middleware: 100 req/day free, 5,000 req/day for verified researchers
- Endpoints exposed: GET /public/ward-index, /public/complaint-trends, /public/dept-stats (all anonymized)
- CORS: allow all origins for public endpoints
**Frontend todo:**
- `/developer` page: API documentation, key request form, code examples (Python + curl)

---

#### E5.2 — CPGRAMS Integration (Bi-directional)
**What:** Central government complaints that land in Delhi departments should auto-import to JanSetu. JanSetu status updates should flow back to CPGRAMS.
**Backend todo:**
- CPGRAMS API integration: poll for new complaints assigned to Delhi departments (daily batch)
- Auto-create grievance in JanSetu with source=`cpgrams`, external_id=`cpgrams_id`
- On JanSetu status change: webhook to CPGRAMS with mapped status (CPGRAMS has different status vocabulary)
- Monthly DARPG report: auto-generate in CPGRAMS-compatible CSV format
**Frontend todo:**
- CM reports page: "CPGRAMS Report" download button (monthly auto-generated)
- CM dashboard: stat showing "X complaints received via CPGRAMS this month"

---

#### E5.3 — Multi-City Architecture (Delhi → Mumbai → Bangalore)
**What:** Make JanSetu deployable for any Indian city within 2 weeks.
**Backend todo:**
- Tenant isolation: add `tenant_id` to all data tables (migration)
- Configuration system: per-tenant department list, SLA policies, ward structure
- Seeding CLI: `python seed.py --city mumbai --config cities/mumbai.json`
- City config format: departments, zones, districts, service categories, SLA defaults
**Frontend todo:**
- Theme system: per-tenant color + logo (env vars)
- City-specific onboarding flow
- Admin panel: city configuration page (departments, SLA settings)

---

#### E5.4 — Annual Governance Report (Auto-Generated PDF)
**What:** Every March, JanSetu generates a 30-page governance performance report for Delhi — submitted to DARPG, tabled in Delhi Assembly, published on website.
**Backend todo:**
- Report generation service: compile WPI trends, economic drag, contractor performance, department scorecards, ward improvement stories
- Format: DARPG-compatible structure (filing date, covering letter, statistical annexures)
- PDF generation: WeasyPrint or reportlab (Python PDF library)
- Endpoint: GET /reporting/annual-report?year=2026 → PDF download
**Frontend todo:**
- CM reports page: "Annual Governance Report" with year selector

---

#### E5.5 — Full DPDP Act 2023 Compliance
**What:** Legal compliance by May 2027 deadline. Penalties up to ₹250 crore per violation.
**Backend todo:**
- Data retention policy: after 1 year of resolved status, auto-anonymize (null out phone, citizen_id)
- "Download my data" endpoint: `GET /identity/me/data-export` → JSON file of all citizen's complaints, notes, feedback
- "Delete my account" endpoint: `DELETE /identity/me` → soft delete with 30-day grace period
- Data breach response: logging system for unauthorized access attempts
- Grievance Officer appointment: designate contact and add to privacy page
**Frontend todo:**
- Privacy page: "Your Rights Under DPDP Act 2023" section
- My-complaints page: Download Data + Delete Account buttons

---

### Epic 5 TODO List

```
[ ] E5.1a  Backend: api_keys table + issuance endpoint
[ ] E5.1b  Backend: rate limiting middleware by API key
[ ] E5.1c  Backend: public anonymized data endpoints (/public/*)
[ ] E5.1d  Frontend: /developer API docs page with key request form
[ ] E5.2a  Backend: CPGRAMS complaint import (daily batch poll)
[ ] E5.2b  Backend: JanSetu → CPGRAMS status webhook
[ ] E5.2c  Backend: Monthly DARPG report auto-generation
[ ] E5.2d  Frontend: CPGRAMS import stats on CM dashboard
[ ] E5.3a  Backend: tenant_id migration across all tables
[ ] E5.3b  Backend: per-tenant config system + seeding CLI
[ ] E5.3c  Frontend: theme system from env vars (logo, colors)
[ ] E5.4a  Backend: annual report PDF generation (WeasyPrint)
[ ] E5.4b  Backend: /reporting/annual-report endpoint
[ ] E5.4c  Frontend: Annual report download on CM reports page
[ ] E5.5a  Backend: data retention auto-anonymization (1yr cron)
[ ] E5.5b  Backend: data export endpoint
[ ] E5.5c  Backend: soft delete with 30-day grace period
[ ] E5.5d  Frontend: Download Data + Delete Account in my-complaints
[ ] E5.X   Legal review by data privacy counsel before CPGRAMS integration
```

---

## Epic Priority & Sequence

| Epic | Theme | Start | Impact | Effort |
|------|-------|-------|--------|--------|
| **Epic 1** | Citizen Experience | NOW | 🔴 Very High | 🟢 Low-Medium |
| **Epic 2** | Field Operations | Week 2 | 🔴 Very High | 🟡 Medium |
| **Epic 3** | Contractor + Budget | Week 4 | 🟠 High | 🟡 Medium |
| **Epic 4** | Predictive + Policy | Week 7 | 🟠 High | 🔴 High |
| **Epic 5** | Platform + Open Gov | Week 10 | 🟡 Medium-High | 🔴 High |

**Start Epic 1 now. Epics 1-3 produce the most visible public impact.**
**Epic 5 is the moat — nobody can build this without Delhi as the proof.**
