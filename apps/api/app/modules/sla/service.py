"""
SLA service — clock management, escalation ladder, breach detection.

SLA resolution_hours is looked up in order of specificity:
  dept + category + priority  (most specific)
  dept + category
  dept + priority
  dept only
  global default (72h)

Escalation ladder (configurable per SLAPolicy):
  Level 0 → assigned officer
  Level 1 (after first_escalation_hours) → supervisor / dept_admin
  Level 2 (+24h) → HOD / district_officer
  Level 3 (+48h) → cm_cell
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.platform.repository import AuditRepository, OutboxRepository
from app.modules.sla.models import EscalationRecord

log = structlog.get_logger()

# Fallback SLA when no policy matches
DEFAULT_SLA_HOURS: dict[str, int] = {
    "CRITICAL": 4,
    "HIGH": 24,
    "MEDIUM": 72,
    "LOW": 168,
}

# Escalation delay after SLA breach, per level (hours)
ESCALATION_DELAYS: dict[int, int] = {1: 0, 2: 24, 3: 48}
ESCALATION_ROLES: dict[int, str] = {
    1: "dept_admin",
    2: "district_officer",
    3: "cm_cell",
}


class SLAService:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session
        self._outbox = OutboxRepository(session)
        self._audit = AuditRepository(session)

    async def compute_sla(
        self,
        dept_id: uuid.UUID,
        category: str | None,
        priority: str,
    ) -> datetime:
        """Return `now() + resolution_hours` from the most-specific matching policy."""
        resolution_h = await self._resolve_hours(dept_id, category, priority)
        return datetime.now(UTC) + timedelta(hours=resolution_h)

    async def _resolve_hours(self, dept_id: uuid.UUID, category: str | None, priority: str) -> int:
        row = (
            await self._s.execute(
                text("""
                SELECT resolution_hours
                FROM sla_policies
                WHERE is_active = true
                  AND (department_id = :dept_id OR department_id IS NULL)
                  AND (category = :category OR category IS NULL)
                  AND (priority = :priority OR priority IS NULL)
                ORDER BY
                  (department_id IS NOT NULL)::int DESC,
                  (category IS NOT NULL)::int DESC,
                  (priority IS NOT NULL)::int DESC
                LIMIT 1
            """),
                {"dept_id": str(dept_id), "category": category, "priority": priority},
            )
        ).fetchone()
        if row:
            return int(row[0])
        return DEFAULT_SLA_HOURS.get(priority, 72)

    # ── Breach detection (called by scheduled worker) ─────────────────────────

    async def check_and_escalate(self) -> dict[str, int]:
        """
        Find SLA-breached grievances and escalate up the ladder.
        Returns counts of escalations performed.
        """
        from app.modules.intake.models import GrievanceStatus

        result = await self._s.execute(
            text("""
                SELECT id, escalation_level, department_id, sla_due_at, assigned_officer_id
                FROM grievances
                WHERE sla_due_at < now()
                  AND status NOT IN ('CLOSED', 'RESOLVED', 'VERIFIED', 'REJECTED_SPAM', 'ESCALATED')
                  AND escalation_level < 3
                ORDER BY sla_due_at ASC
                LIMIT 200
            """)
        )
        rows = result.fetchall()
        escalated = 0
        for row in rows:
            gid, level, _dept_id, sla_due, _officer_id = (
                str(row[0]),
                int(row[1]),
                str(row[2]),
                row[3],
                str(row[4]) if row[4] else None,
            )
            next_level = level + 1
            escalated_to_role = ESCALATION_ROLES.get(next_level, "cm_cell")

            await self._s.execute(
                text("""
                    UPDATE grievances SET
                      escalation_level = :lvl,
                      status = 'ESCALATED',
                      updated_at = now()
                    WHERE id = :id
                """),
                {"lvl": next_level, "id": gid},
            )

            from app.modules.intake.models import StatusEvent

            self._s.add(
                StatusEvent(
                    grievance_id=uuid.UUID(gid),
                    from_status="ASSIGNED",
                    to_status=GrievanceStatus.ESCALATED.value,
                    actor_id="sla_engine",
                    actor_role="system",
                    note=f"SLA breached — escalated to {escalated_to_role} (level {next_level})",
                )
            )

            self._s.add(
                EscalationRecord(
                    grievance_id=uuid.UUID(gid),
                    level=next_level,
                    escalated_to_role=escalated_to_role,
                    reason="SLA breach",
                )
            )

            await self._outbox.emit(
                event_type="grievance.escalated",
                aggregate_type="grievance",
                aggregate_id=gid,
                payload={
                    "grievance_id": gid,
                    "level": next_level,
                    "escalated_to_role": escalated_to_role,
                    "sla_due_at": sla_due.isoformat() if sla_due else None,
                },
            )
            escalated += 1

        await self._s.commit()
        log.info("sla.check_done", escalated=escalated, checked=len(rows))
        return {"checked": len(rows), "escalated": escalated}

    async def get_sla_status(self, grievance_id: uuid.UUID) -> dict[str, Any]:
        row = (
            await self._s.execute(
                text("""
                SELECT sla_due_at, escalation_level, status,
                       now() > sla_due_at AS is_breached,
                       EXTRACT(EPOCH FROM (sla_due_at - now())) / 3600 AS hours_remaining
                FROM grievances WHERE id = :id
            """),
                {"id": str(grievance_id)},
            )
        ).fetchone()
        if not row:
            return {}
        return {
            "sla_due_at": row[0],
            "escalation_level": row[1],
            "status": row[2],
            "is_breached": row[3],
            "hours_remaining": round(float(row[4]), 1) if row[4] else None,
        }
