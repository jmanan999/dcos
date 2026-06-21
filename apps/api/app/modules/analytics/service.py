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
    DailyTrendPoint,
    DeptLeaderboardRow,
    ExecutiveBrief,
    ExecutiveBriefSection,
    KPISnapshot,
    NLQueryRequest,
    NLQueryResponse,
    WardHotspot,
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
            SELECT department, total, resolved, open, sla_breaches,
                   resolution_rate, avg_resolution_hours, avg_csat, reopen_rate
            FROM mv_dept_stats
            ORDER BY resolution_rate DESC NULLS LAST
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
