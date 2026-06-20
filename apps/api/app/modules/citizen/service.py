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
                await self._transition(grievance_id, "RESOLVED", "VERIFIED", "citizen", "citizen", f"CSAT {rating}/5")
            else:
                # Low rating = implicit reopen
                await self._transition(grievance_id, "RESOLVED", "REOPENED", "citizen", "citizen", f"Low CSAT ({rating}/5) — reopened automatically")
                await self._emit_outbox(str(grievance_id), "grievance.reopened")

        result = await self._db.execute(
            text("SELECT id, grievance_id, rating, comment, created_at FROM feedback WHERE grievance_id = CAST(:gid AS uuid)"),
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
        totals = await self._db.execute(text("""
            SELECT
                COUNT(*) AS total_filed,
                COUNT(*) FILTER (WHERE status IN ('RESOLVED','VERIFIED','CLOSED')) AS total_resolved,
                COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS total_open,
                ROUND(
                    AVG(
                        EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600.0
                    ) FILTER (WHERE closed_at IS NOT NULL),
                2) AS avg_resolution_hours
            FROM grievances
        """))
        t = totals.fetchone()

        by_cat = await self._db.execute(text("""
            SELECT category, COUNT(*) AS cnt
            FROM grievances
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY cnt DESC
            LIMIT 10
        """))

        by_dept = await self._db.execute(text("""
            SELECT d.name, COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')) AS resolved
            FROM grievances g
            JOIN departments d ON d.id = g.department_id
            GROUP BY d.name
            ORDER BY total DESC
            LIMIT 10
        """))

        hotspots = await self._db.execute(text("""
            SELECT w.name, w.centroid_lat, w.centroid_lng,
                   COUNT(*) FILTER (WHERE g.status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS open_count,
                   COUNT(*) AS total_count
            FROM grievances g
            JOIN wards w ON w.id = g.ward_id
            GROUP BY w.id, w.name, w.centroid_lat, w.centroid_lng
            HAVING COUNT(*) > 0
            ORDER BY open_count DESC
            LIMIT 50
        """))

        dept_rows = by_dept.fetchall()

        return PublicKPISnapshot(
            total_filed=t[0] or 0,
            total_resolved=t[1] or 0,
            total_open=t[2] or 0,
            avg_resolution_hours=float(t[3]) if t[3] else None,
            by_category=[CategoryStat(category=r[0], count=r[1]) for r in by_cat.fetchall()],
            by_department=[
                DeptStat(
                    department=r[0],
                    total=r[1],
                    resolved=r[2],
                    resolution_rate=round(r[2] / r[1] * 100, 1) if r[1] > 0 else 0.0,
                )
                for r in dept_rows
            ],
            hotspots=[
                HotspotPoint(
                    ward_name=r[0],
                    lat=float(r[1]) if r[1] else 0,
                    lng=float(r[2]) if r[2] else 0,
                    open_count=r[3] or 0,
                    total_count=r[4] or 0,
                )
                for r in hotspots.fetchall()
                if r[1] is not None and r[2] is not None
            ],
        )

    # ── Notification helpers (called by worker) ────────────────────────────────

    async def notify_status_change(
        self,
        grievance_id: uuid.UUID,
    ) -> None:
        """
        Look up grievance + citizen contact info, dispatch WhatsApp/SMS notification.
        Called by the outbox relay worker.
        """
        result = await self._db.execute(
            text("""
                SELECT g.tracking_id, g.status, g.language, g.citizen_phone,
                       u.phone
                FROM grievances g
                LEFT JOIN users u ON u.id = g.citizen_id
                WHERE g.id = CAST(:id AS uuid)
            """),
            {"id": str(grievance_id)},
        )
        row = result.fetchone()
        if not row:
            return

        tracking_id, status, language, citizen_phone, user_phone = row
        phone = citizen_phone or user_phone
        message = status_change_message(tracking_id, status, language or "en")

        if phone:
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
