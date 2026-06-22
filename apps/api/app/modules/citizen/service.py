"""
Citizen module service — CSAT feedback, reopen, public stats, notification dispatch.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.notifications import dispatch as dispatch_notification
from app.core.notifications import status_change_message
from app.modules.citizen.schemas import (
    CategoryStat,
    DeptStat,
    FeedbackRead,
    HotspotPoint,
    PublicKPISnapshot,
)

log = structlog.get_logger()


class CitizenService:
    def __init__(self, session: AsyncSession) -> None:
        self._db = session

    # ── CSAT / feedback ───────────────────────────────────────────────────────

    async def submit_feedback(
        self,
        grievance_id: uuid.UUID,
        rating: int,
        comment: str | None,
        citizen_id: uuid.UUID | None,
    ) -> FeedbackRead:
        """
        Record CSAT. If rating >= 3, transition RESOLVED→VERIFIED.
        If rating <= 2, treat as implicit reopen request.
        """
        grev = await self._db.execute(
            text("SELECT id, status, citizen_id FROM grievances WHERE id = CAST(:id AS uuid)"),
            {"id": str(grievance_id)},
        )
        row = grev.fetchone()
        if not row:
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Grievance not found")

        # Upsert feedback (unique per grievance)
        fb_id = uuid.uuid4()
        await self._db.execute(
            text("""
                INSERT INTO feedback (id, grievance_id, citizen_id, rating, comment, created_at)
                VALUES (CAST(:id AS uuid), CAST(:gid AS uuid), CAST(:cid AS uuid), :rating, :comment, now())
                ON CONFLICT (grievance_id) DO UPDATE
                SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
                RETURNING id
            """),
            {
                "id": str(fb_id),
                "gid": str(grievance_id),
                "cid": str(citizen_id) if citizen_id else None,
                "rating": rating,
                "comment": comment,
            },
        )

        current_status = row[1]
        if current_status == "RESOLVED":
            if rating >= 3:
                await self._transition(
                    grievance_id, "RESOLVED", "VERIFIED", "citizen", "citizen", f"CSAT {rating}/5"
                )
            else:
                # Low rating = implicit reopen
                await self._transition(
                    grievance_id,
                    "RESOLVED",
                    "REOPENED",
                    "citizen",
                    "citizen",
                    f"Low CSAT ({rating}/5) — reopened automatically",
                )
                await self._emit_outbox(str(grievance_id), "grievance.reopened")

        result = await self._db.execute(
            text(
                "SELECT id, grievance_id, rating, comment, created_at FROM feedback WHERE grievance_id = CAST(:gid AS uuid)"
            ),
            {"gid": str(grievance_id)},
        )
        fb_row = result.fetchone()
        return FeedbackRead(
            id=fb_row[0],
            grievance_id=fb_row[1],
            rating=fb_row[2],
            comment=fb_row[3],
            created_at=fb_row[4],
        )

    # ── Reopen ────────────────────────────────────────────────────────────────

    async def reopen(
        self,
        grievance_id: uuid.UUID,
        reason: str,
        citizen_id: uuid.UUID | None,
    ) -> dict:
        grev = await self._db.execute(
            text("SELECT status FROM grievances WHERE id = CAST(:id AS uuid)"),
            {"id": str(grievance_id)},
        )
        row = grev.fetchone()
        if not row:
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Grievance not found")

        status = row[0]
        if status not in ("RESOLVED", "VERIFIED"):
            from fastapi import HTTPException

            raise HTTPException(
                status_code=422,
                detail=f"Can only reopen a RESOLVED or VERIFIED grievance, current status: {status}",
            )

        await self._transition(grievance_id, status, "REOPENED", "citizen", "citizen", reason)
        await self._emit_outbox(str(grievance_id), "grievance.reopened")
        log.info("citizen.reopen", grievance_id=str(grievance_id))
        return {"status": "REOPENED", "reason": reason}

    # ── Public stats (no auth needed) ─────────────────────────────────────────

    async def get_public_stats(self) -> PublicKPISnapshot:
        """Return anonymized aggregated stats for the public transparency dashboard."""
        import logging
        log = logging.getLogger(__name__)

        # ── totals ───────────────────────────────────────────────────────────────
        total_filed = total_resolved = total_open = 0
        avg_hours: float | None = None
        try:
            r = await self._db.execute(text("""
                SELECT
                    COUNT(*) AS total_filed,
                    COUNT(*) FILTER (WHERE status IN ('RESOLVED','VERIFIED','CLOSED')) AS total_resolved,
                    COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS total_open,
                    ROUND(
                        AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600.0)
                        FILTER (WHERE closed_at IS NOT NULL), 2
                    ) AS avg_resolution_hours
                FROM grievances
            """))
            t = r.fetchone()
            if t:
                total_filed = int(t[0] or 0)
                total_resolved = int(t[1] or 0)
                total_open = int(t[2] or 0)
                avg_hours = float(t[3]) if t[3] is not None else None
        except Exception as exc:
            log.error("public_stats totals query failed: %s", exc)

        # ── by_category ──────────────────────────────────────────────────────────
        categories: list[CategoryStat] = []
        try:
            r = await self._db.execute(text("""
                SELECT category, COUNT(*) AS cnt
                FROM grievances
                WHERE category IS NOT NULL
                GROUP BY category ORDER BY cnt DESC LIMIT 10
            """))
            categories = [CategoryStat(category=row[0], count=int(row[1])) for row in r.fetchall()]
        except Exception as exc:
            log.error("public_stats category query failed: %s", exc)

        # ── by_department ────────────────────────────────────────────────────────
        departments: list[DeptStat] = []
        try:
            r = await self._db.execute(text("""
                SELECT COALESCE(d.name, 'Other') AS dept_name,
                       COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')) AS resolved
                FROM grievances g
                LEFT JOIN departments d ON d.id = g.department_id
                GROUP BY 1 ORDER BY total DESC LIMIT 10
            """))
            departments = [
                DeptStat(
                    department=row[0],
                    total=int(row[1]),
                    resolved=int(row[2]),
                    resolution_rate=round(row[2] / row[1] * 100, 1) if row[1] > 0 else 0.0,
                )
                for row in r.fetchall()
            ]
        except Exception as exc:
            log.error("public_stats dept query failed: %s", exc)

        # ── hotspots ─────────────────────────────────────────────────────────────
        hotspots: list[HotspotPoint] = []
        try:
            r = await self._db.execute(text("""
                SELECT w.name,
                       w.centroid_lat,
                       w.centroid_lng,
                       COUNT(*) FILTER (WHERE g.status NOT IN
                           ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS open_count,
                       COUNT(*) AS total_count
                FROM grievances g
                JOIN wards w ON w.id = g.ward_id
                WHERE w.centroid_lat IS NOT NULL AND w.centroid_lng IS NOT NULL
                GROUP BY w.id, w.name, w.centroid_lat, w.centroid_lng
                HAVING COUNT(*) > 0
                ORDER BY open_count DESC LIMIT 50
            """))
            hotspots = [
                HotspotPoint(
                    ward_name=row[0],
                    lat=float(row[1]),
                    lng=float(row[2]),
                    open_count=int(row[3] or 0),
                    total_count=int(row[4] or 0),
                )
                for row in r.fetchall()
            ]
        except Exception as exc:
            log.error("public_stats hotspots query failed: %s", exc)

        return PublicKPISnapshot(
            total_filed=total_filed,
            total_resolved=total_resolved,
            total_open=total_open,
            avg_resolution_hours=avg_hours,
            by_category=categories,
            by_department=departments,
            hotspots=hotspots,
        )

    # ── Notification helpers (called by worker) ────────────────────────────────

    async def notify_status_change(
        self,
        grievance_id: uuid.UUID,
    ) -> None:
        """
        Rich, context-aware WhatsApp/SMS notification to citizen on every status change.
        Includes officer name, department, SLA deadline, and action prompts.
        Called by the outbox relay worker for all lifecycle events.
        """
        result = await self._db.execute(
            text("""
                SELECT
                    g.tracking_id, g.status, g.language,
                    g.citizen_phone, u.phone, g.category,
                    -- Officer name and department
                    o_user.name AS officer_name,
                    d.name AS department_name,
                    -- SLA deadline in human-readable form
                    TO_CHAR(g.sla_due_at AT TIME ZONE 'Asia/Kolkata', 'DD Mon, HH12:MI AM') AS sla_due_str
                FROM grievances g
                LEFT JOIN users u ON u.id = g.citizen_id
                LEFT JOIN officers o ON o.id = g.assigned_officer_id
                LEFT JOIN users o_user ON o_user.id = o.user_id
                LEFT JOIN departments d ON d.id = g.department_id
                WHERE g.id = CAST(:id AS uuid)
            """),
            {"id": str(grievance_id)},
        )
        row = result.fetchone()
        if not row:
            return

        (
            tracking_id,
            status,
            language,
            citizen_phone,
            user_phone,
            category,
            officer_name,
            dept_name,
            sla_due_str,
        ) = row

        phone = citizen_phone or user_phone
        if not phone:
            return

        message = status_change_message(
            tracking_id,
            status,
            language or "en",
            officer_name=officer_name,
            department=dept_name,
            sla_due_at=sla_due_str,
            category=category,
        )

        await dispatch_notification(
            self._db,
            user_id=None,
            grievance_id=grievance_id,
            channel="whatsapp",
            message=message,
            phone=phone,
        )

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _transition(
        self,
        grievance_id: uuid.UUID,
        from_status: str,
        to_status: str,
        actor_id: str,
        actor_role: str,
        note: str,
    ) -> None:
        await self._db.execute(
            text("""
                UPDATE grievances SET status = :to, updated_at = now()
                WHERE id = CAST(:id AS uuid)
            """),
            {"to": to_status, "id": str(grievance_id)},
        )
        await self._db.execute(
            text("""
                INSERT INTO status_events
                    (id, grievance_id, from_status, to_status, actor_id, actor_role, note, ts)
                VALUES
                    (uuid_generate_v4(), CAST(:gid AS uuid), :from, :to, :actor, :role, :note, now())
            """),
            {
                "gid": str(grievance_id),
                "from": from_status,
                "to": to_status,
                "actor": actor_id,
                "role": actor_role,
                "note": note,
            },
        )

    async def _emit_outbox(self, aggregate_id: str, event_type: str) -> None:
        await self._db.execute(
            text("""
                INSERT INTO outbox_events (id, event_type, aggregate_id, payload, created_at)
                VALUES (uuid_generate_v4(), :etype, :agg_id, '{}', now())
            """),
            {"etype": event_type, "agg_id": aggregate_id},
        )
