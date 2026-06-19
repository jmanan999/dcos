"""
Routing service — assigns classified grievances to the right officer.

Algorithm:
  1. Resolve department from grievance.department_id (set by AI enrichment)
  2. Find eligible officers in that department (is_available=True, ward match)
  3. Load-balance: pick officer with fewest open cases
  4. Set SLA clock via SLAService
  5. Transition status CLASSIFIED → ASSIGNED
  6. Write assignment_history row + outbox event
"""
from __future__ import annotations

import uuid

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.intake.models import Grievance, GrievanceStatus, StatusEvent
from app.modules.intake.repository import GrievanceRepository
from app.modules.platform.repository import AuditRepository, OutboxRepository
from app.modules.routing.schemas import AssignmentResult
from app.modules.sla.service import SLAService
from app.modules.workforce.models import AssignmentHistory

log = structlog.get_logger()


class RoutingService:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session
        self._repo = GrievanceRepository(session)
        self._outbox = OutboxRepository(session)
        self._audit = AuditRepository(session)
        self._sla = SLAService(session)

    async def assign(self, grievance_id: uuid.UUID) -> AssignmentResult:
        grievance = await self._s.get(Grievance, grievance_id)
        if not grievance:
            return AssignmentResult(
                grievance_id=grievance_id,
                assigned_officer_id=None,
                department_id=None,
                sla_due_at=None,
                status="error",
                message="Grievance not found",
            )

        if not grievance.department_id:
            log.warning("routing.no_dept", grievance_id=str(grievance_id))
            return AssignmentResult(
                grievance_id=grievance_id,
                assigned_officer_id=None,
                department_id=None,
                sla_due_at=None,
                status="skipped",
                message="No department set — waiting for AI enrichment",
            )

        if grievance.status in (GrievanceStatus.REJECTED_SPAM.value,):
            return AssignmentResult(
                grievance_id=grievance_id,
                assigned_officer_id=None,
                department_id=grievance.department_id,
                sla_due_at=None,
                status="skipped",
                message="Spam — not routed",
            )

        # Pick officer
        officer_id = await self._pick_officer(grievance)

        # Compute SLA due time
        sla_due_at = await self._sla.compute_sla(
            dept_id=grievance.department_id,
            category=grievance.category,
            priority=grievance.priority,
        )

        # Update grievance
        await self._s.execute(
            text("""
                UPDATE grievances SET
                  assigned_officer_id = :officer_id,
                  sla_due_at = :sla_due_at,
                  status = :status,
                  updated_at = now()
                WHERE id = :id
            """),
            {
                "officer_id": str(officer_id) if officer_id else None,
                "sla_due_at": sla_due_at,
                "status": GrievanceStatus.ASSIGNED.value,
                "id": str(grievance_id),
            },
        )

        # Status event
        self._s.add(StatusEvent(
            grievance_id=grievance_id,
            from_status=grievance.status,
            to_status=GrievanceStatus.ASSIGNED.value,
            actor_id="routing_engine",
            actor_role="system",
            note=f"Auto-assigned to officer {officer_id}" if officer_id else "No officer available",
        ))

        # Assignment history
        if officer_id:
            self._s.add(AssignmentHistory(
                grievance_id=grievance_id,
                officer_id=officer_id,
                department_id=grievance.department_id,
                assigned_by_id="routing_engine",
            ))

        # Outbox
        await self._outbox.emit(
            event_type="grievance.assigned",
            aggregate_type="grievance",
            aggregate_id=str(grievance_id),
            payload={
                "grievance_id": str(grievance_id),
                "officer_id": str(officer_id) if officer_id else None,
                "department_id": str(grievance.department_id),
                "sla_due_at": sla_due_at.isoformat() if sla_due_at else None,
            },
        )

        log.info(
            "routing.assigned",
            grievance_id=str(grievance_id),
            officer_id=str(officer_id) if officer_id else None,
            dept_id=str(grievance.department_id),
        )

        return AssignmentResult(
            grievance_id=grievance_id,
            assigned_officer_id=officer_id,
            department_id=grievance.department_id,
            sla_due_at=sla_due_at,
            status="assigned",
            message=f"Assigned to officer {officer_id}" if officer_id else "Queued — no officer available",
        )

    async def reassign(
        self,
        grievance_id: uuid.UUID,
        reason: str,
        actor_id: str,
    ) -> AssignmentResult:
        """Re-route when officer clicks 'Not my department' or on escalation."""
        grievance = await self._s.get(Grievance, grievance_id)
        if not grievance:
            return AssignmentResult(
                grievance_id=grievance_id, assigned_officer_id=None,
                department_id=None, sla_due_at=None, status="error",
                message="Not found",
            )
        # Unassign current officer
        if grievance.assigned_officer_id:
            # Close the current assignment_history row
            await self._s.execute(
                text("""
                    UPDATE assignment_history
                    SET unassigned_at = now(), reason = :reason
                    WHERE grievance_id = :gid AND unassigned_at IS NULL
                """),
                {"gid": str(grievance_id), "reason": reason},
            )
        # Re-route
        return await self.assign(grievance_id)

    # ── Load-balanced officer selection ───────────────────────────────────────

    async def _pick_officer(self, grievance: Grievance) -> uuid.UUID | None:
        """
        Select the available officer in the correct department with the
        fewest currently open grievances (load balancing).
        Respects ward jurisdiction if set on the officer.
        """
        # Two query variants to avoid NULL type ambiguity with asyncpg
        base = """
            SELECT o.id, COUNT(g.id) AS open_cases
            FROM officers o
            LEFT JOIN grievances g
              ON g.assigned_officer_id = o.id
              AND g.status NOT IN ('CLOSED', 'REJECTED_SPAM', 'RESOLVED', 'VERIFIED')
            WHERE o.department_id = :dept_id
              AND o.is_available = true
        """
        if grievance.ward_id:
            # Ward-scoped query — CAST(:ward_id AS uuid) avoids ::uuid parse issue
            query = text(base + """
              AND (o.ward_ids IS NULL OR CAST(:ward_id AS uuid) = ANY(o.ward_ids))
            GROUP BY o.id
            HAVING COUNT(g.id) < o.max_active_cases
            ORDER BY open_cases ASC LIMIT 1
            """)
            params: dict = {"dept_id": str(grievance.department_id), "ward_id": str(grievance.ward_id)}
        else:
            query = text(base + """
            GROUP BY o.id
            HAVING COUNT(g.id) < o.max_active_cases
            ORDER BY open_cases ASC LIMIT 1
            """)
            params = {"dept_id": str(grievance.department_id)}

        row = (await self._s.execute(query, params)).fetchone()

        return uuid.UUID(str(row[0])) if row else None
