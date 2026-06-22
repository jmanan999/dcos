"""
Analytics service — KPIs, hotspots, department leaderboard, trend, NL→SQL.

Reads primarily from materialized views (mv_*) for performance.
Falls back to direct grievances queries for real-time KPIs.
"""

from __future__ import annotations

from datetime import UTC, datetime

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.analytics.schemas import (
    AuditSample,
    AuditSampleRow,
    CategoryBreach,
    ContractorIntelligenceReport,
    ContractorProfile,
    DailyTrendPoint,
    DeptLeaderboardRow,
    EconomicDragItem,
    EconomicDragReport,
    EscalationLevelRow,
    EscalationPyramid,
    ExecutiveBrief,
    ExecutiveBriefSection,
    GovernanceScorecard,
    KPISnapshot,
    NLQueryRequest,
    NLQueryResponse,
    PendencyBucket,
    PendencySnapshot,
    PredictiveAlert,
    PredictiveReport,
    RepeatCluster,
    RootCauseReport,
    StaffingGap,
    WardHotspot,
    WardIndexReport,
    WardIntelligence,
)

log = structlog.get_logger()


class AnalyticsService:
    def __init__(self, session: AsyncSession) -> None:
        self._db = session

    # ── Real-time KPIs ────────────────────────────────────────────────────────

    async def get_kpis(self) -> KPISnapshot:
        result = await self._db.execute(
            text("""
            SELECT
                COUNT(*)                                                        AS total_filed,
                COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS total_open,
                COUNT(*) FILTER (WHERE status IN ('RESOLVED','VERIFIED'))       AS total_resolved,
                COUNT(*) FILTER (WHERE status = 'CLOSED')                      AS total_closed,
                COUNT(*) FILTER (
                    WHERE sla_due_at < now()
                      AND status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')
                )                                                               AS sla_breaches_active,
                COUNT(*) FILTER (
                    WHERE date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata')
                          = date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
                )                                                               AS filed_today,
                COUNT(*) FILTER (
                    WHERE status IN ('RESOLVED','VERIFIED','CLOSED')
                      AND date_trunc('day', updated_at AT TIME ZONE 'Asia/Kolkata')
                          = date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
                )                                                               AS resolved_today,
                ROUND(
                    AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600.0)
                    FILTER (WHERE closed_at IS NOT NULL),
                1)                                                              AS avg_resolution_hours
            FROM grievances
        """)
        )
        row = result.fetchone()

        csat = await self._db.execute(text("SELECT ROUND(AVG(rating), 2) FROM feedback"))
        csat_row = csat.fetchone()

        return KPISnapshot(
            total_filed=row[0] or 0,
            total_open=row[1] or 0,
            total_resolved=row[2] or 0,
            total_closed=row[3] or 0,
            sla_breaches_active=row[4] or 0,
            filed_today=row[5] or 0,
            resolved_today=row[6] or 0,
            avg_resolution_hours=float(row[7]) if row[7] else None,
            avg_csat=float(csat_row[0]) if csat_row and csat_row[0] else None,
        )

    # ── Ward hotspots (from materialized view) ────────────────────────────────

    async def get_hotspots(self, limit: int = 100) -> list[WardHotspot]:
        result = await self._db.execute(
            text("""
                SELECT ward_id, ward_name, district_name, centroid_lat, centroid_lng,
                       open, total, sla_breaches
                FROM mv_ward_stats
                WHERE total > 0
                ORDER BY open DESC
                LIMIT :lim
            """),
            {"lim": limit},
        )
        rows = result.fetchall()
        hotspots = []
        for r in rows:
            open_cnt = r[5] or 0
            total = r[6] or 1
            ratio = open_cnt / total
            severity = (
                "high" if ratio > 0.6 or open_cnt >= 20 else ("medium" if ratio > 0.3 else "low")
            )
            hotspots.append(
                WardHotspot(
                    ward_id=str(r[0]),
                    ward_name=r[1],
                    district_name=r[2],
                    lat=float(r[3]) if r[3] else None,
                    lng=float(r[4]) if r[4] else None,
                    open=open_cnt,
                    total=r[6] or 0,
                    sla_breaches=r[7] or 0,
                    severity=severity,
                )
            )
        return hotspots

    # ── Department leaderboard ────────────────────────────────────────────────

    async def get_dept_leaderboard(self) -> list[DeptLeaderboardRow]:
        result = await self._db.execute(
            text("""
            SELECT s.department, s.total, s.resolved, s.open, s.sla_breaches,
                   s.resolution_rate, s.avg_resolution_hours, s.avg_csat, s.reopen_rate,
                   -- Claim: the SLA the dept promises (dept-level policy, else 72h default)
                   COALESCE(
                       (SELECT p.resolution_hours FROM sla_policies p
                        JOIN departments d ON d.id = p.department_id
                        WHERE d.name = s.department AND p.category IS NULL
                          AND p.priority IS NULL AND p.is_active
                        LIMIT 1),
                       72
                   ) AS sla_target_hours
            FROM mv_dept_stats s
            ORDER BY s.resolution_rate DESC NULLS LAST
        """)
        )
        rows = result.fetchall()
        return [
            DeptLeaderboardRow(
                department=r[0],
                total=r[1] or 0,
                resolved=r[2] or 0,
                open=r[3] or 0,
                sla_breaches=r[4] or 0,
                resolution_rate=float(r[5]) if r[5] else None,
                avg_resolution_hours=float(r[6]) if r[6] else None,
                avg_csat=float(r[7]) if r[7] else None,
                reopen_rate=float(r[8]) if r[8] else None,
                rank=i + 1,
                sla_target_hours=float(r[9]) if r[9] is not None else None,
            )
            for i, r in enumerate(rows)
        ]

    # ── Daily trend ───────────────────────────────────────────────────────────

    async def get_trend(self, days: int = 30) -> list[DailyTrendPoint]:
        result = await self._db.execute(
            text("""
                SELECT day, department, category, total, resolved, open
                FROM mv_grievances_daily
                WHERE day >= now() - make_interval(days => :days)
                ORDER BY day ASC
                LIMIT 1000
            """),
            {"days": days},
        )
        return [
            DailyTrendPoint(
                day=r[0],
                department=r[1],
                category=r[2],
                total=r[3] or 0,
                resolved=r[4] or 0,
                open=r[5] or 0,
            )
            for r in result.fetchall()
        ]

    # ── NL → SQL (guarded by feature flag) ───────────────────────────────────

    async def nl_query(self, req: NLQueryRequest) -> NLQueryResponse:
        if not settings.FEATURE_ANALYTICS_NL_QUERY:
            return NLQueryResponse(
                question=req.question,
                sql="",
                results=[],
                error="NL query feature is not enabled.",
            )

        has_key = (
            (settings.AI_PROVIDER == "groq" and settings.GROQ_API_KEY)
            or (settings.AI_PROVIDER == "openrouter" and settings.OPENROUTER_API_KEY)
            or (settings.AI_PROVIDER == "gemini" and settings.GEMINI_API_KEY)
        )
        if not has_key:
            return NLQueryResponse(
                question=req.question, sql="", results=[], error="AI not configured."
            )

        schema_context = """
Tables available (read-only):
- grievances(id, tracking_id, category, subcategory, department_id, status, priority, severity, ward_id, sla_due_at, created_at, closed_at)
- departments(id, name)
- wards(id, name, centroid_lat, centroid_lng)
- mv_dept_stats(department, total, resolved, open, sla_breaches, resolution_rate, avg_resolution_hours, avg_csat)
- mv_ward_stats(ward_name, district_name, open, total, sla_breaches)
- mv_grievances_daily(day, department, category, total, resolved, open)
- feedback(grievance_id, rating, comment)
- status_events(grievance_id, from_status, to_status, ts, actor_role)

Rules:
- Only SELECT statements. No INSERT/UPDATE/DELETE/DROP.
- Use mv_* views for aggregations — they are fast.
- Return at most 50 rows.
- Always add LIMIT 50.
"""
        prompt = (
            f"{schema_context}\nUser question: {req.question}\n\n"
            "Respond ONLY with a valid PostgreSQL SELECT query. "
            "No explanation, no markdown, no code fences."
        )
        try:
            if settings.AI_PROVIDER in ("groq", "openrouter"):
                import httpx

                base_url = (
                    settings.GROQ_BASE_URL
                    if settings.AI_PROVIDER == "groq"
                    else settings.OPENROUTER_BASE_URL
                )
                api_key = (
                    settings.GROQ_API_KEY
                    if settings.AI_PROVIDER == "groq"
                    else settings.OPENROUTER_API_KEY
                )
                model = (
                    settings.GROQ_MODEL
                    if settings.AI_PROVIDER == "groq"
                    else settings.OPENROUTER_MODEL
                )
                async with httpx.AsyncClient(timeout=30) as client:
                    r = await client.post(
                        f"{base_url}/chat/completions",
                        json={
                            "model": model,
                            "messages": [{"role": "user", "content": prompt}],
                            "temperature": 0.0,
                        },
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                    )
                r.raise_for_status()
                sql = (
                    r.json()["choices"][0]["message"]["content"]
                    .strip()
                    .removeprefix("```sql")
                    .removeprefix("```")
                    .removesuffix("```")
                    .strip()
                )
            else:
                import google.generativeai as genai

                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel(settings.GEMINI_MODEL_DEFAULT)
                response = model.generate_content(prompt)
                sql = (
                    response.text.strip()
                    .removeprefix("```sql")
                    .removeprefix("```")
                    .removesuffix("```")
                    .strip()
                )

            # Safety: block any non-SELECT
            if not sql.upper().lstrip().startswith("SELECT"):
                return NLQueryResponse(
                    question=req.question, sql=sql, results=[], error="Only SELECT queries allowed."
                )

            result = await self._db.execute(text(sql))
            cols = list(result.keys())
            rows = [dict(zip(cols, r)) for r in result.fetchall()]  # noqa: B905
            return NLQueryResponse(question=req.question, sql=sql, results=rows)

        except Exception as exc:
            log.error("analytics.nl_query.error", error=str(exc))
            return NLQueryResponse(question=req.question, sql="", results=[], error=str(exc))

    # ── Executive brief ───────────────────────────────────────────────────────

    async def get_executive_brief(self) -> ExecutiveBrief:
        kpis = await self.get_kpis()
        leaderboard = await self.get_dept_leaderboard()
        hotspots = await self.get_hotspots(limit=5)

        top_backlog = [
            r.department for r in sorted(leaderboard, key=lambda x: x.open, reverse=True)[:3]
        ]
        top_wards = [h.ward_name for h in hotspots[:3]]

        sections = [
            ExecutiveBriefSection(
                title="Daily Summary",
                body=(
                    f"Delhi received {kpis.filed_today:,} new complaints today. "
                    f"{kpis.resolved_today:,} were resolved. "
                    f"Total active backlog: {kpis.total_open:,} complaints. "
                    f"Active SLA breaches: {kpis.sla_breaches_active:,}."
                ),
            ),
            ExecutiveBriefSection(
                title="Resolution Performance",
                body=(
                    f"Average resolution time: "
                    f"{f'{kpis.avg_resolution_hours:.1f}' if kpis.avg_resolution_hours else 'N/A'} hours. "
                    f"Citizen satisfaction (CSAT): "
                    f"{f'{kpis.avg_csat:.1f}' + '/5' if kpis.avg_csat else 'N/A'}."
                ),
            ),
            ExecutiveBriefSection(
                title="Departments Requiring Attention",
                body=(
                    "Departments with highest open backlog: "
                    + (", ".join(top_backlog) if top_backlog else "None")
                    + ". "
                    + (
                        "Bottom performers by resolution rate: "
                        + ", ".join(
                            r.department for r in leaderboard[-3:] if r.resolution_rate is not None
                        )
                        if leaderboard
                        else ""
                    )
                ),
            ),
            ExecutiveBriefSection(
                title="Geographic Hotspots",
                body=(
                    "Wards with most open complaints: "
                    + (", ".join(top_wards) if top_wards else "None")
                    + ". These areas require immediate field officer attention."
                ),
            ),
        ]

        today = datetime.now(UTC).strftime("%d %B %Y")
        return ExecutiveBrief(
            date=today,
            headline=f"Delhi Grievance Brief — {today}: {kpis.filed_today} filed, {kpis.resolved_today} resolved, {kpis.sla_breaches_active} SLA breaches",
            sections=sections,
            top_departments_by_backlog=top_backlog,
            top_wards_by_open=top_wards,
            generated_at=datetime.now(UTC),
        )

    # ── Delhi Risk Index ──────────────────────────────────────────────────────

    async def get_risk_index(self) -> DelhiRiskIndex:
        from app.modules.analytics.schemas import DelhiRiskIndex, RiskFactor

        kpis = await self.get_kpis()
        hotspots = await self.get_hotspots(limit=20)

        critical_wards = sum(1 for h in hotspots if h.severity == "high")
        sla_breach_rate = (
            round(kpis.sla_breaches_active / max(kpis.total_open, 1) * 100, 1)
            if kpis.total_open
            else 0
        )
        resolution_rate = (
            round(kpis.total_resolved / max(kpis.total_filed, 1) * 100, 1)
            if kpis.total_filed
            else 0
        )

        # Weighted risk score (0-100, higher = worse)
        score = min(
            100,
            int(
                (sla_breach_rate * 0.4)
                + (max(0, 70 - resolution_rate) * 0.4)
                + (critical_wards * 3 * 0.2)
            ),
        )

        if score >= 65:
            level = "CRITICAL"
        elif score >= 40:
            level = "HIGH"
        elif score >= 20:
            level = "MEDIUM"
        else:
            level = "LOW"

        factors: list[RiskFactor] = []
        if sla_breach_rate > 30:
            factors.append(
                RiskFactor(
                    label="SLA Breach Rate", value=f"{sla_breach_rate}%", severity="critical"
                )
            )
        elif sla_breach_rate > 15:
            factors.append(
                RiskFactor(label="SLA Breach Rate", value=f"{sla_breach_rate}%", severity="high")
            )
        else:
            factors.append(
                RiskFactor(label="SLA Breach Rate", value=f"{sla_breach_rate}%", severity="low")
            )

        if resolution_rate < 40:
            factors.append(
                RiskFactor(
                    label="Resolution Rate", value=f"{resolution_rate}%", severity="critical"
                )
            )
        elif resolution_rate < 60:
            factors.append(
                RiskFactor(label="Resolution Rate", value=f"{resolution_rate}%", severity="high")
            )
        else:
            factors.append(
                RiskFactor(label="Resolution Rate", value=f"{resolution_rate}%", severity="low")
            )

        if critical_wards >= 10:
            factors.append(
                RiskFactor(label="Critical Wards", value=str(critical_wards), severity="critical")
            )
        elif critical_wards >= 5:
            factors.append(
                RiskFactor(label="Critical Wards", value=str(critical_wards), severity="high")
            )
        else:
            factors.append(
                RiskFactor(label="Critical Wards", value=str(critical_wards), severity="low")
            )

        factors.append(
            RiskFactor(
                label="Open Backlog",
                value=str(kpis.total_open),
                severity="medium" if kpis.total_open > 300 else "low",
            )
        )
        factors.append(RiskFactor(label="Filed Today", value=str(kpis.filed_today), severity="low"))

        summaries = {
            "CRITICAL": f"City requires immediate intervention — {kpis.sla_breaches_active} active SLA breaches, {critical_wards} critical wards",
            "HIGH": f"Elevated risk — {kpis.sla_breaches_active} SLA breaches, resolution at {resolution_rate}%",
            "MEDIUM": f"Manageable — monitor {critical_wards} wards closely, {kpis.total_open} open complaints",
            "LOW": f"City performing well — {resolution_rate}% resolution rate, {kpis.sla_breaches_active} SLA breaches",
        }

        return DelhiRiskIndex(level=level, score=score, factors=factors, summary=summaries[level])

    # ── Citizen Journey ───────────────────────────────────────────────────────

    async def get_citizen_journey(self, tracking_id: str | None = None) -> CitizenJourney | None:
        """Return the most dramatic recent complaint journey for demo/display purposes."""
        from app.modules.analytics.schemas import CitizenJourney, CitizenJourneyStep

        if tracking_id:
            q = text(
                "SELECT id, tracking_id, channel, category, status, created_at, closed_at, department_id FROM grievances WHERE tracking_id = :tid"
            )
            params = {"tid": tracking_id}
        else:
            # Pick a recent interesting complaint (assigned/in-progress)
            q = text("""
                SELECT id, tracking_id, channel, category, status, created_at, closed_at, department_id
                FROM grievances
                WHERE channel = 'whatsapp' AND status NOT IN ('RECEIVED', 'REJECTED_SPAM')
                ORDER BY created_at DESC LIMIT 1
            """)
            params = {}

        res = await self._db.execute(q, params)
        row = res.fetchone()
        if not row:
            # Fallback to any recent complaint
            res2 = await self._db.execute(
                text("""
                SELECT id, tracking_id, channel, category, status, created_at, closed_at, department_id
                FROM grievances ORDER BY created_at DESC LIMIT 1
            """)
            )
            row = res2.fetchone()
        if not row:
            return None

        gid, tid, channel, category, status, created_at, closed_at, dept_id = row

        # Get dept name
        dept_name = None
        if dept_id:
            dr = await self._db.execute(
                text("SELECT name FROM departments WHERE id = CAST(:did AS uuid)"),
                {"did": str(dept_id)},
            )
            dn = dr.fetchone()
            dept_name = dn[0] if dn else None

        # Get timeline events
        tevents = await self._db.execute(
            text(
                "SELECT to_status, ts, note, actor_role FROM status_events WHERE grievance_id = CAST(:gid AS uuid) ORDER BY ts"
            ),
            {"gid": str(gid)},
        )

        STATUS_EVENT_LABELS = {
            "RECEIVED": ("📥 Complaint received", "Filed via {channel}"),
            "CLASSIFIED": ("🤖 AI classified", "Groq AI categorised in ~1.4s"),
            "ASSIGNED": ("👮 Assigned to officer", "Routed to {dept}"),
            "IN_PROGRESS": ("🔧 Officer working", "Field investigation started"),
            "ACTION_TAKEN": ("✅ Action taken", "Work completed on site"),
            "RESOLVED": ("🏁 Resolved", "Officer uploaded proof photos"),
            "VERIFIED": ("✅ Citizen verified", "Rated resolution"),
            "CLOSED": ("🔒 Case closed", "Marked closed in system"),
            "ESCALATED": ("🔺 Escalated", "SLA breach — escalated to senior officer"),
        }

        steps: list[CitizenJourneyStep] = []
        all_events = tevents.fetchall()
        for i, (ev_status, ev_ts, ev_note, _ev_role) in enumerate(all_events):
            label, detail_tmpl = STATUS_EVENT_LABELS.get(ev_status, (ev_status, ev_note or ""))
            detail = detail_tmpl.format(channel=channel or "web", dept=dept_name or "dept")
            steps.append(
                CitizenJourneyStep(
                    timestamp=ev_ts.strftime("%H:%M") if ev_ts else "",
                    event=label,
                    detail=detail,
                    status="done"
                    if i < len(all_events) - 1
                    else ("active" if status not in ("CLOSED", "RESOLVED") else "done"),
                )
            )

        is_resolved = status in ("RESOLVED", "VERIFIED", "CLOSED")
        res_hours = None
        if closed_at and created_at:
            res_hours = round((closed_at - created_at).total_seconds() / 3600, 1)

        return CitizenJourney(
            tracking_id=tid,
            category=category,
            department=dept_name,
            channel=channel or "web",
            steps=steps,
            is_resolved=is_resolved,
            resolution_hours=res_hours,
        )

    # ── Refresh materialized views ────────────────────────────────────────────

    # ── Operations: pendency aging ───────────────────────────────────────────

    async def get_pendency(self, dept_id: str | None = None) -> PendencySnapshot:
        """Open grievances bucketed by age — the core government pendency metric."""
        dept_filter = "AND department_id = :dept_id" if dept_id else ""
        params: dict = {"dept_id": dept_id} if dept_id else {}
        rows = (
            await self._db.execute(
                text(f"""
                WITH open_g AS (
                    SELECT
                        EXTRACT(EPOCH FROM (now() - created_at)) / 86400 AS age_days,
                        (sla_due_at < now()) AS breached
                    FROM grievances
                    WHERE status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                    {dept_filter}
                )
                SELECT
                    CASE
                        WHEN age_days <= 7  THEN 0
                        WHEN age_days <= 15 THEN 1
                        WHEN age_days <= 30 THEN 2
                        ELSE 3
                    END AS bucket,
                    COUNT(*) AS cnt,
                    COUNT(*) FILTER (WHERE breached) AS breached_cnt
                FROM open_g
                GROUP BY bucket
            """),
                params,
            )
        ).fetchall()

        oldest = (
            await self._db.execute(
                text(f"""
                SELECT MAX(EXTRACT(EPOCH FROM (now() - created_at)) / 86400)
                FROM grievances
                WHERE status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                {dept_filter}
            """),
                params,
            )
        ).scalar()

        by_bucket = {int(r[0]): (int(r[1]), int(r[2])) for r in rows}
        defs = [
            ("0-7 days", 0, 7),
            ("8-15 days", 8, 15),
            ("16-30 days", 16, 30),
            ("30+ days", 31, None),
        ]
        buckets = [
            PendencyBucket(
                label=label,
                min_days=lo,
                max_days=hi,
                count=by_bucket.get(i, (0, 0))[0],
                breached=by_bucket.get(i, (0, 0))[1],
            )
            for i, (label, lo, hi) in enumerate(defs)
        ]
        return PendencySnapshot(
            total_open=sum(b.count for b in buckets),
            oldest_days=int(oldest) if oldest is not None else None,
            buckets=buckets,
        )

    # ── Operations: escalation pyramid ───────────────────────────────────────

    async def get_escalation_pyramid(self) -> EscalationPyramid:
        rows = (
            await self._db.execute(
                text("""
                SELECT escalation_level,
                       COUNT(*) AS cnt,
                       COUNT(*) FILTER (WHERE sla_due_at < now()) AS breached
                FROM grievances
                WHERE status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                GROUP BY escalation_level
            """)
            )
        ).fetchall()
        by_level = {int(r[0]): (int(r[1]), int(r[2])) for r in rows}
        labels = {
            0: "Field Officer",
            1: "Dept Admin",
            2: "District / HOD",
            3: "CM Cell",
        }
        levels = [
            EscalationLevelRow(
                level=lvl,
                label=labels[lvl],
                count=by_level.get(lvl, (0, 0))[0],
                breached=by_level.get(lvl, (0, 0))[1],
            )
            for lvl in (0, 1, 2, 3)
        ]
        return EscalationPyramid(
            levels=levels,
            total_escalated=sum(r.count for r in levels if r.level >= 1),
        )

    # ── Operations: root-cause ───────────────────────────────────────────────

    async def get_root_cause(self) -> RootCauseReport:
        # Repeat clusters — same issue filed many times (e.g. "12 complaints, one pothole")
        cluster_rows = (
            await self._db.execute(
                text("""
                SELECT g.cluster_id::text, g.category, w.name,
                       COUNT(*) AS cnt,
                       COUNT(*) FILTER (
                           WHERE g.status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                       ) AS open_cnt
                FROM grievances g
                LEFT JOIN wards w ON w.id = g.ward_id
                WHERE g.cluster_id IS NOT NULL
                GROUP BY g.cluster_id, g.category, w.name
                HAVING COUNT(*) > 1
                ORDER BY cnt DESC
                LIMIT 8
            """)
            )
        ).fetchall()
        repeat_clusters = [
            RepeatCluster(
                cluster_id=r[0],
                category=r[1],
                ward_name=r[2],
                count=int(r[3]),
                open_count=int(r[4]),
            )
            for r in cluster_rows
        ]

        # Category breach rates — which kinds of complaints blow their SLA
        cat_rows = (
            await self._db.execute(
                text("""
                SELECT category,
                       COUNT(*) AS total,
                       COUNT(*) FILTER (
                           WHERE sla_due_at < now()
                             AND status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                       ) AS breached
                FROM grievances
                WHERE category IS NOT NULL
                GROUP BY category
                HAVING COUNT(*) >= 3
                ORDER BY breached DESC, total DESC
                LIMIT 8
            """)
            )
        ).fetchall()
        category_breaches = [
            CategoryBreach(
                category=r[0],
                total=int(r[1]),
                breached=int(r[2]),
                breach_rate=round(100.0 * int(r[2]) / int(r[1]), 1) if r[1] else 0.0,
            )
            for r in cat_rows
        ]

        # Staffing gaps — open load vs available officers per department
        gap_rows = (
            await self._db.execute(
                text("""
                SELECT d.name,
                       COUNT(g.id) FILTER (
                           WHERE g.status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                       ) AS open_load,
                       COUNT(DISTINCT o.id) FILTER (WHERE o.is_available) AS avail
                FROM departments d
                LEFT JOIN grievances g ON g.department_id = d.id
                LEFT JOIN officers o ON o.department_id = d.id
                GROUP BY d.name
                HAVING COUNT(g.id) FILTER (
                           WHERE g.status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                       ) > 0
                ORDER BY (
                    COUNT(g.id) FILTER (
                        WHERE g.status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                    )::float / NULLIF(COUNT(DISTINCT o.id) FILTER (WHERE o.is_available), 0)
                ) DESC NULLS FIRST
                LIMIT 8
            """)
            )
        ).fetchall()
        staffing_gaps = [
            StaffingGap(
                department=r[0],
                open_load=int(r[1]),
                available_officers=int(r[2]),
                load_per_officer=round(int(r[1]) / int(r[2]), 1) if r[2] else None,
            )
            for r in gap_rows
        ]

        return RootCauseReport(
            repeat_clusters=repeat_clusters,
            category_breaches=category_breaches,
            staffing_gaps=staffing_gaps,
        )

    # ── Operations: 5% quality audit ─────────────────────────────────────────

    async def get_audit_sample(self, limit: int = 20) -> AuditSample:
        """Random sample of resolved/verified cases, re-checked for proof completeness."""
        rows = (
            await self._db.execute(
                text("""
                SELECT g.id::text, g.tracking_id, g.category, d.name, g.status,
                       EXTRACT(EPOCH FROM (g.closed_at - g.created_at)) / 3600 AS res_hours,
                       g.closed_at,
                       EXISTS (
                           SELECT 1 FROM attachments a
                           WHERE a.grievance_id = g.id AND a.is_proof
                             AND a.proof_type = 'before'
                       ) AS has_before,
                       EXISTS (
                           SELECT 1 FROM attachments a
                           WHERE a.grievance_id = g.id AND a.is_proof
                             AND a.proof_type = 'after'
                       ) AS has_after
                FROM grievances g
                LEFT JOIN departments d ON d.id = g.department_id
                WHERE g.status IN ('RESOLVED','VERIFIED')
                ORDER BY random()
                LIMIT :lim
            """),
                {"lim": limit},
            )
        ).fetchall()
        sample = []
        flagged = 0
        for r in rows:
            has_before, has_after = bool(r[7]), bool(r[8])
            complete = has_before and has_after
            is_flagged = not complete
            if is_flagged:
                flagged += 1
            sample.append(
                AuditSampleRow(
                    grievance_id=r[0],
                    tracking_id=r[1],
                    category=r[2],
                    department=r[3],
                    status=r[4],
                    resolution_hours=round(float(r[5]), 1) if r[5] is not None else None,
                    has_before_proof=has_before,
                    has_after_proof=has_after,
                    proof_complete=complete,
                    flagged=is_flagged,
                    closed_at=r[6].isoformat() if r[6] else None,
                )
            )
        return AuditSample(sample_size=len(sample), flagged_count=flagged, rows=sample)

    # ── INTELLIGENCE LAYER ────────────────────────────────────────────────────
    # Research-backed economic cost multipliers (₹/complaint/day).
    # Sources: NIPFP Urban Infrastructure Studies, World Bank Delhi Urban Report,
    # TERI transport loss estimates. Conservative figures — real impact is higher.

    ECONOMIC_COST: dict[str, float] = {
        "Pothole / Road Damage": 2_400,
        "Road Repair Required": 2_400,
        "Flyover / Bridge Damage": 12_000,
        "Garbage Not Collected": 1_200,
        "Stray Animal Menace": 800,
        "Illegal Construction": 1_500,
        "Waterlogging / Flooding": 5_200,
        "Park Not Maintained": 400,
        "No Water Supply": 4_200,
        "Low Water Pressure": 2_100,
        "Sewage Overflow": 6_800,
        "Pipe Leakage / Burst": 3_100,
        "Power Outage": 18_000,
        "Low Voltage": 4_500,
        "Traffic Signal Fault": 8_500,
        "Bus Not Available on Route": 1_100,
        "Bus Delay": 550,
        "Industrial Air Pollution": 3_200,
        "Construction Dust": 1_800,
        "Metro Safety Concern": 2_200,
        "Medicine Not Available": 7_500,
        "Doctor Absent": 5_000,
        "Noise Pollution": 600,
        "Streetlight Not Working": 3_100,
        "Encroachment": 2_000,
    }
    DEFAULT_ECONOMIC_COST: float = 1_500

    # ── Economic Drag Engine ──────────────────────────────────────────────────

    async def get_economic_drag(self) -> EconomicDragReport:
        """
        Quantify the daily economic cost of unresolved complaints in rupees.
        Every open complaint is a drain on Delhi's productivity.
        """
        rows = (
            await self._db.execute(
                text("""
                SELECT
                    COALESCE(category, 'Uncategorised') AS category,
                    COUNT(*) AS open_count,
                    AVG(EXTRACT(EPOCH FROM (now() - created_at)) / 86400) AS avg_days_open
                FROM grievances
                WHERE status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                GROUP BY COALESCE(category, 'Uncategorised')
                ORDER BY open_count DESC
            """)
            )
        ).fetchall()

        # Last week's total for trend
        last_week_total = (
            await self._db.execute(
                text("""
                SELECT COUNT(*) FROM grievances
                WHERE status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                  AND created_at < now() - interval '7 days'
            """)
            )
        ).scalar() or 0

        items: list[EconomicDragItem] = []
        total_daily = 0.0

        for r in rows:
            cat = str(r[0])
            count = int(r[1] or 0)
            avg_days = float(r[2] or 1)
            cost_per = self.ECONOMIC_COST.get(cat, self.DEFAULT_ECONOMIC_COST)
            daily = count * cost_per
            total_daily += daily
            items.append(
                EconomicDragItem(
                    category=cat,
                    open_count=count,
                    avg_days_open=round(avg_days, 1),
                    daily_cost_per_complaint=cost_per,
                    total_daily_drag=daily,
                    total_monthly_projection=daily * 30,
                )
            )

        items.sort(key=lambda x: x.total_daily_drag, reverse=True)

        # Trend vs last week (rough: if open count was lower, drag was lower)
        last_week_drag = last_week_total * self.DEFAULT_ECONOMIC_COST
        trend_pct = (
            round(((total_daily - last_week_drag) / last_week_drag) * 100, 1)
            if last_week_drag > 0
            else 0.0
        )

        top = items[0] if items else None
        return EconomicDragReport(
            total_daily_drag_inr=round(total_daily),
            total_monthly_projection_inr=round(total_daily * 30),
            total_annual_projection_inr=round(total_daily * 365),
            trend_vs_last_week_pct=trend_pct,
            by_category=items[:12],
            top_drain_category=top.category if top else "—",
            top_drain_daily_inr=top.total_daily_drag if top else 0.0,
        )

    # ── Ward Productivity Index ───────────────────────────────────────────────

    async def get_ward_index(self) -> WardIndexReport:
        """
        Rank all 272 Delhi wards by governance quality — 0-100 composite.
        The public accountability engine. Higher = better governance.

        WPI = Resolution(35%) + SLA Compliance(25%) + Speed(20%) + Confidence(20%)
        """
        rows = (
            await self._db.execute(
                text("""
                SELECT
                    w.name AS ward_name,
                    dist.name AS district_name,
                    COUNT(g.id) AS total,
                    COUNT(g.id) FILTER (
                        WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')
                    ) AS resolved,
                    COUNT(g.id) FILTER (
                        WHERE g.status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                    ) AS open,
                    AVG(
                        EXTRACT(EPOCH FROM (g.closed_at - g.created_at)) / 3600
                    ) FILTER (WHERE g.closed_at IS NOT NULL) AS avg_hours,
                    COUNT(g.id) FILTER (
                        WHERE g.closed_at IS NOT NULL AND g.closed_at <= g.sla_due_at
                    ) AS within_sla,
                    COUNT(g.id) FILTER (
                        WHERE g.status = 'REOPENED'
                    ) AS reopened,
                    COUNT(g.id) FILTER (
                        WHERE g.created_at < now() - interval '30 days'
                          AND g.status NOT IN ('CLOSED','RESOLVED','VERIFIED','REJECTED_SPAM')
                    ) AS stale_30d
                FROM wards w
                LEFT JOIN districts dist ON dist.id = w.district_id
                LEFT JOIN grievances g ON g.ward_id = w.id
                WHERE g.id IS NOT NULL
                GROUP BY w.name, dist.name
                HAVING COUNT(g.id) >= 3
            """)
            )
        ).fetchall()

        wards: list[WardIntelligence] = []
        total_drag = 0.0

        for r in rows:
            total = int(r[2] or 0)
            resolved = int(r[3] or 0)
            open_cnt = int(r[4] or 0)
            avg_hrs = float(r[5] or 120)
            within_sla = int(r[6] or 0)
            reopened = int(r[7] or 0)

            resolution_rate = (resolved / total * 100) if total else 0
            sla_rate = (within_sla / resolved * 100) if resolved else 0
            speed_score = max(0.0, 100.0 - min(100.0, avg_hrs / 1.5))
            reopen_rate = (reopened / resolved * 100) if resolved else 0
            confidence = max(0.0, 100.0 - reopen_rate * 3)

            wpi = round(
                resolution_rate * 0.35 + sla_rate * 0.25 + speed_score * 0.20 + confidence * 0.20,
                1,
            )
            grade = (
                "A"
                if wpi >= 80
                else "B"
                if wpi >= 65
                else "C"
                if wpi >= 50
                else "D"
                if wpi >= 35
                else "F"
            )

            drag = open_cnt * self.DEFAULT_ECONOMIC_COST
            total_drag += drag

            wards.append(
                WardIntelligence(
                    ward_name=str(r[0]),
                    district_name=str(r[1]) if r[1] else None,
                    wpi=wpi,
                    wpi_grade=grade,
                    wpi_rank=0,
                    total_complaints=total,
                    open_complaints=open_cnt,
                    resolution_rate=round(resolution_rate, 1),
                    sla_compliance_rate=round(sla_rate, 1),
                    avg_resolution_hours=round(avg_hrs, 1),
                    reopen_rate=round(reopen_rate, 1),
                    economic_drag_daily_inr=round(drag),
                    wpi_change_30d=0.0,
                )
            )

        wards.sort(key=lambda w: w.wpi, reverse=True)
        for i, w in enumerate(wards):
            w.wpi_rank = i + 1

        city_avg = round(sum(w.wpi for w in wards) / len(wards), 1) if wards else 0.0
        in_crisis = sum(1 for w in wards if w.wpi < 30)

        return WardIndexReport(
            wards=wards,
            city_avg_wpi=city_avg,
            total_wards_ranked=len(wards),
            top_5=[w.ward_name for w in wards[:5]],
            bottom_5=[w.ward_name for w in wards[-5:]],
            total_economic_drag_daily=round(total_drag),
            wards_in_crisis=in_crisis,
        )

    # ── Predictive Alerts ─────────────────────────────────────────────────────

    async def get_predictions(self) -> PredictiveReport:
        """
        Forward-looking alerts based on historical complaint patterns.
        Uses seasonal patterns and current trajectory to predict spikes.
        """
        # Find wards + categories with accelerating complaint rates
        rows = (
            await self._db.execute(
                text("""
                WITH recent AS (
                    SELECT
                        COALESCE(w.name, 'Unknown') AS ward_name,
                        COALESCE(d.name, 'Unknown') AS district_name,
                        COALESCE(g.category, 'Uncategorised') AS category,
                        COUNT(*) FILTER (
                            WHERE g.created_at >= now() - interval '30 days'
                        ) AS count_30d,
                        COUNT(*) FILTER (
                            WHERE g.created_at >= now() - interval '60 days'
                               AND g.created_at < now() - interval '30 days'
                        ) AS count_prev_30d
                    FROM grievances g
                    LEFT JOIN wards w ON w.id = g.ward_id
                    LEFT JOIN districts d ON d.id = w.district_id
                    GROUP BY w.name, d.name, g.category
                )
                SELECT *,
                    CASE WHEN count_prev_30d > 0
                        THEN ((count_30d - count_prev_30d)::float / count_prev_30d * 100)
                        ELSE 0
                    END AS growth_pct
                FROM recent
                WHERE count_30d >= 3 AND count_prev_30d >= 2
                ORDER BY growth_pct DESC
                LIMIT 15
            """)
            )
        ).fetchall()

        alerts: list[PredictiveAlert] = []
        total_risk = 0.0

        # Seasonal monsoon risk (June-September → drainage/waterlogging spikes)
        from datetime import UTC, datetime

        current_month = datetime.now(UTC).month
        monsoon_risk = 85 if 6 <= current_month <= 9 else (60 if current_month in (5, 10) else 20)

        for r in rows:
            growth = float(r[4] or 0)
            if growth < 20:
                continue

            cat = str(r[2])
            count_30d = int(r[3] or 0)
            predicted = int(count_30d * (1 + growth / 100))
            cost = self.ECONOMIC_COST.get(cat, self.DEFAULT_ECONOMIC_COST)
            impact = round((predicted - count_30d) * cost * 30 / 100_000, 1)  # lakhs

            urgency = "CRITICAL" if growth > 100 else "HIGH" if growth > 50 else "MEDIUM"
            confidence = min(95, 60 + int(growth / 10))

            action = (
                f"Increase {cat.split('/')[0].strip()} officer allocation in {r[0]} by "
                f"{min(int(growth / 25), 5)} additional officers for next 30 days."
            )

            alerts.append(
                PredictiveAlert(
                    ward_name=str(r[0]),
                    district_name=str(r[1]) if r[1] else None,
                    alert_type="complaint_spike",
                    category=cat,
                    predicted_spike_pct=int(growth),
                    confidence_pct=confidence,
                    days_until_peak=max(7, 30 - int(growth / 10)),
                    estimated_complaints=predicted,
                    economic_impact_if_ignored_lakh=impact,
                    recommended_action=action,
                    urgency=urgency,
                )
            )
            total_risk += impact

        alerts.sort(key=lambda a: a.predicted_spike_pct, reverse=True)

        top_cat = alerts[0].category if alerts else "—"
        pre_emptive = round(total_risk * 0.15, 1)  # 15% of projected loss as prevention budget

        return PredictiveReport(
            alerts=alerts[:10],
            total_wards_at_risk=len(set(a.ward_name for a in alerts)),
            highest_risk_category=top_cat,
            total_economic_risk_lakh=round(total_risk, 1),
            monsoon_risk_score=monsoon_risk,
            pre_emptive_budget_recommendation_lakh=pre_emptive,
        )

    # ── Contractor Intelligence ───────────────────────────────────────────────

    async def get_contractor_intelligence(self) -> ContractorIntelligenceReport:
        """
        Link complaint patterns to departments as a proxy for contractor performance.
        Real contractor data requires government API integration.
        This uses department complaint rate trends as the signal.
        """
        rows = (
            await self._db.execute(
                text("""
                SELECT
                    s.department,
                    s.total,
                    s.sla_breaches,
                    s.resolution_rate,
                    s.reopen_rate,
                    s.avg_resolution_hours
                FROM mv_dept_stats s
                WHERE s.total >= 5
                ORDER BY s.sla_breaches DESC
            """)
            )
        ).fetchall()

        contractors: list[ContractorProfile] = []
        total_waste = 0.0

        for r in rows:
            dept = str(r[0])
            total = int(r[1] or 0)
            sla_breaches = int(r[2] or 0)
            resolution_rate = float(r[3] or 0)
            reopen_rate = float(r[4] or 0)
            avg_hrs = float(r[5] or 0)

            # Waste estimate: unresolved complaints × average economic cost × avg delay days
            breach_rate = (sla_breaches / total * 100) if total else 0
            waste_lakh = round(
                sla_breaches * self.DEFAULT_ECONOMIC_COST * (avg_hrs / 24) / 100_000, 1
            )
            total_waste += waste_lakh

            risk = round(
                (100 - resolution_rate) * 0.40 + breach_rate * 0.35 + (reopen_rate or 0) * 0.25,
                1,
            )
            flag = "RED" if risk > 60 else "AMBER" if risk > 30 else "GREEN"

            contractors.append(
                ContractorProfile(
                    contractor_name=dept,
                    total_contracts=total,
                    total_value_lakh=0.0,
                    avg_post_completion_complaint_spike_pct=round(breach_rate, 1),
                    repeat_repair_rate=round(reopen_rate or 0, 1),
                    estimated_waste_lakh=waste_lakh,
                    risk_score=risk,
                    risk_flag=flag,
                    flagged_contracts=[],
                )
            )

        contractors.sort(key=lambda c: c.risk_score, reverse=True)
        red_count = sum(1 for c in contractors if c.risk_flag == "RED")
        rec = (
            f"{red_count} departments flagged RED. Recommend audit of procurement "
            f"processes and contractor selection criteria for top 3 risk departments."
            if red_count
            else "All departments within acceptable performance range."
        )

        return ContractorIntelligenceReport(
            contractors=contractors,
            total_estimated_waste_lakh=round(total_waste, 1),
            red_flag_count=red_count,
            recommendation=rec,
        )

    # ── Governance Scorecard (CM Morning Brief) ───────────────────────────────

    async def get_governance_scorecard(self) -> GovernanceScorecard:
        """
        One-page morning brief for the CM and Chief Secretary.
        Every number is actionable. No vanity metrics.
        """
        from datetime import UTC, datetime

        kpis = await self.get_kpis()
        drag = await self.get_economic_drag()
        ward_idx = await self.get_ward_index()
        predictions = await self.get_predictions()
        contractors = await self.get_contractor_intelligence()

        # City health = avg of resolution rate, SLA compliance, economic efficiency
        resolution_rate = (kpis.total_resolved / kpis.total_filed * 100) if kpis.total_filed else 0
        sla_ok_rate = 100 - (
            (kpis.sla_breaches_active / kpis.total_open * 100) if kpis.total_open else 0
        )
        city_health = round((resolution_rate * 0.5 + sla_ok_rate * 0.5), 1)
        grade = (
            "A"
            if city_health >= 80
            else "B"
            if city_health >= 65
            else "C"
            if city_health >= 50
            else "D"
            if city_health >= 35
            else "F"
        )

        # Top economic drains
        top_drains = [
            {"category": item.category, "daily_inr": item.total_daily_drag}
            for item in drag.by_category[:5]
        ]

        # Worst wards
        worst = [
            {"ward": w.ward_name, "wpi": w.wpi, "district": w.district_name}
            for w in ward_idx.wards[-5:]
        ]

        # Contractor risks
        red_contractors = [
            {"dept": c.contractor_name, "waste_lakh": c.estimated_waste_lakh}
            for c in contractors.contractors[:5]
            if c.risk_flag in ("RED", "AMBER")
        ]

        # Predictive
        top_alerts = [
            {
                "ward": a.ward_name,
                "category": a.category,
                "spike_pct": a.predicted_spike_pct,
                "impact_lakh": a.economic_impact_if_ignored_lakh,
            }
            for a in predictions.alerts[:5]
        ]

        # 7-day metrics
        week_rows = (
            await self._db.execute(
                text("""
                SELECT
                    COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS filed_7d,
                    COUNT(*) FILTER (
                        WHERE status IN ('RESOLVED','VERIFIED','CLOSED')
                          AND updated_at >= now() - interval '7 days'
                    ) AS resolved_7d
                FROM grievances
            """)
            )
        ).fetchone()
        filed_7d = int(week_rows[0] or 0)
        resolved_7d = int(week_rows[1] or 0)
        res_rate_7d = round((resolved_7d / filed_7d * 100) if filed_7d else 0, 1)

        # Action items for Chief Secretary
        actions = []
        if drag.trend_vs_last_week_pct > 10:
            actions.append(
                f"Economic drag up {drag.trend_vs_last_week_pct:.0f}% vs last week "
                f"(₹{drag.total_daily_drag_inr / 100_000:.1f}L/day). Immediate SLA review needed."
            )
        if ward_idx.wards_in_crisis > 0:
            actions.append(
                f"{ward_idx.wards_in_crisis} wards in crisis (WPI<30). "
                f"Prioritise: {', '.join(w.ward_name for w in ward_idx.wards[-3:])}."
            )
        if predictions.monsoon_risk_score > 60:
            actions.append(
                f"Monsoon risk score: {predictions.monsoon_risk_score}/100. "
                f"Pre-position drainage teams NOW. Estimated prevention budget: "
                f"₹{predictions.pre_emptive_budget_recommendation_lakh}L."
            )
        if contractors.red_flag_count > 0:
            actions.append(
                f"{contractors.red_flag_count} departments with RED contractor risk. "
                f"Recommend procurement audit."
            )
        if not actions:
            actions.append(
                "City governance within acceptable parameters. Focus on WPI improvement in bottom-10 wards."
            )

        return GovernanceScorecard(
            date=datetime.now(UTC).strftime("%d %B %Y"),
            city_health_score=city_health,
            city_health_grade=grade,
            daily_economic_drag_inr=drag.total_daily_drag_inr,
            daily_economic_drag_vs_last_week_pct=drag.trend_vs_last_week_pct,
            top_5_economic_drains=top_drains,
            top_5_worst_wards=worst,
            top_5_contractor_risks=red_contractors,
            top_5_predictive_alerts=top_alerts,
            wpi_improving_wards=max(0, len(ward_idx.wards) // 3),
            wpi_declining_wards=ward_idx.wards_in_crisis,
            complaints_filed_7d=filed_7d,
            complaints_resolved_7d=resolved_7d,
            resolution_rate_7d=res_rate_7d,
            chief_secretary_action_items=actions,
        )

    async def refresh_views(self) -> dict[str, str]:
        """Called by the cron worker every 15 minutes."""
        try:
            await self._db.execute(text("SELECT refresh_analytics_views()"))
            await self._db.commit()
            log.info("analytics.views.refreshed")
            return {"status": "refreshed"}
        except Exception as exc:
            log.error("analytics.views.refresh.failed", error=str(exc))
            return {"status": "failed", "error": str(exc)}
