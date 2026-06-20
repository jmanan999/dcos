"""
Reporting service — CSV export, executive brief text, department scorecard.

PDF/PPTX generation requires openpyxl/reportlab; those are optional deps.
CSV export works with stdlib only.
"""

from __future__ import annotations

import csv
import io

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger()


class ReportingService:
    def __init__(self, session: AsyncSession) -> None:
        self._db = session

    async def export_csv(
        self,
        department_id: str | None = None,
        status: str | None = None,
        days: int = 30,
    ) -> tuple[str, int]:
        """
        Export grievances as CSV text.
        Returns (csv_string, row_count).
        """
        conditions = ["g.created_at >= now() - make_interval(days => :days)"]
        params: dict = {"days": days}

        if department_id:
            conditions.append("g.department_id = CAST(:dept_id AS uuid)")
            params["dept_id"] = department_id
        if status:
            conditions.append("g.status = :status")
            params["status"] = status

        where = " AND ".join(conditions)
        query = text(f"""  # noqa: S608
            SELECT
                g.tracking_id,
                g.created_at AT TIME ZONE 'Asia/Kolkata' AS created_ist,
                g.status,
                g.category,
                g.subcategory,
                g.priority,
                g.severity,
                d.name AS department,
                w.name AS ward,
                g.language,
                g.channel,
                g.is_emergency,
                g.sla_due_at AT TIME ZONE 'Asia/Kolkata' AS sla_due_ist,
                g.closed_at AT TIME ZONE 'Asia/Kolkata' AS closed_ist,
                ROUND(
                    EXTRACT(EPOCH FROM (g.closed_at - g.created_at)) / 3600.0,
                1) AS resolution_hours,
                f.rating AS csat_rating
            FROM grievances g
            LEFT JOIN departments d ON d.id = g.department_id
            LEFT JOIN wards w ON w.id = g.ward_id
            LEFT JOIN feedback f ON f.grievance_id = g.id
            WHERE {where}
            ORDER BY g.created_at DESC
            LIMIT 10000
        """)

        result = await self._db.execute(query, params)
        rows = result.fetchall()
        cols = list(result.keys())

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(cols)
        for row in rows:
            writer.writerow([str(v) if v is not None else "" for v in row])

        return buf.getvalue(), len(rows)

    async def dept_scorecard_csv(self) -> tuple[str, int]:
        """Department scorecard as CSV from the materialized view."""
        result = await self._db.execute(
            text("""
            SELECT
                department,
                total,
                resolved,
                open,
                sla_breaches,
                resolution_rate,
                avg_resolution_hours,
                avg_csat,
                reopen_rate
            FROM mv_dept_stats
            ORDER BY resolution_rate DESC NULLS LAST
        """)
        )
        rows = result.fetchall()
        cols = list(result.keys())

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(cols)
        for row in rows:
            writer.writerow([str(v) if v is not None else "" for v in row])

        return buf.getvalue(), len(rows)

    async def ward_stats_csv(self) -> tuple[str, int]:
        """Ward statistics as CSV."""
        result = await self._db.execute(
            text("""
            SELECT ward_name, district_name, total, open, resolved,
                   avg_resolution_hours, sla_breaches
            FROM mv_ward_stats
            ORDER BY open DESC
        """)
        )
        rows = result.fetchall()
        cols = list(result.keys())

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(cols)
        for row in rows:
            writer.writerow([str(v) if v is not None else "" for v in row])

        return buf.getvalue(), len(rows)
