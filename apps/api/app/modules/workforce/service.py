"""
Workforce service — officer actions on grievances.

Actions and allowed transitions:
  claim        ASSIGNED/ESCALATED → IN_PROGRESS
  mark_action_taken IN_PROGRESS → ACTION_TAKEN
  resolve      IN_PROGRESS/ACTION_TAKEN → RESOLVED  (requires before+after proof)
  add_note     any open status → same  (internal note; handoff re-routes dept)
  request_info IN_PROGRESS → IN_PROGRESS  (citizen ping via outbox)

Proof enforcement (resolve is blocked unless):
  - ≥1 is_proof=True attachment with proof_type='before'
  - ≥1 is_proof=True attachment with proof_type='after'
  - After proof must be newer than the grievance's created_at (timestamp check)
  - After proof EXIF location must be within 500m of grievance location (geo check;
    skipped if no EXIF — not all officers have EXIF-capable devices)
"""

from __future__ import annotations

import math
import uuid

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import TokenClaims
from app.modules.intake.models import Attachment, Grievance, GrievanceStatus, StatusEvent
from app.modules.intake.repository import GrievanceRepository
from app.modules.platform.repository import AuditRepository, OutboxRepository
from app.modules.workforce.models import OfficerNote
from app.modules.workforce.schemas import (
    ClosureRequest,
    GrievanceSummary,
    OfficerNoteCreate,
    OfficerNoteRead,
    ProofVerificationResult,
    WorkloadSummary,
)

log = structlog.get_logger()

GEO_TOLERANCE_M = 500  # proof photo must be within 500m of grievance location


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ, Δλ = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(Δφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class WorkforceService:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session
        self._repo = GrievanceRepository(session)
        self._outbox = OutboxRepository(session)
        self._audit = AuditRepository(session)

    # ── Queue views ───────────────────────────────────────────────────────────

    async def get_queue(self, officer_id: uuid.UUID) -> list[GrievanceSummary]:
        """Officer's personal queue — sorted by SLA breach + severity."""
        rows = (
            await self._s.execute(
                text("""
            SELECT id, tracking_id, raw_text, category, subcategory, severity,
              status, priority, ward_id, latitude, longitude, sla_due_at,
              escalation_level, is_emergency, created_at, updated_at,
              EXTRACT(EPOCH FROM (sla_due_at - now())) / 3600,
              (sla_due_at < now())
            FROM grievances
            WHERE assigned_officer_id = :oid
              AND status NOT IN ('CLOSED','REJECTED_SPAM','RESOLVED','VERIFIED')
            ORDER BY (sla_due_at < now()) DESC, sla_due_at ASC NULLS LAST, severity DESC
        """),
                {"oid": str(officer_id)},
            )
        ).fetchall()
        return [_row_to_summary(r) for r in rows]

    async def get_dept_queue(self, department_id: uuid.UUID) -> list[GrievanceSummary]:
        """All open grievances for a department (dept_admin view)."""
        rows = (
            await self._s.execute(
                text("""
            SELECT id, tracking_id, raw_text, category, subcategory, severity,
              status, priority, ward_id, latitude, longitude, sla_due_at,
              escalation_level, is_emergency, created_at, updated_at,
              EXTRACT(EPOCH FROM (sla_due_at - now())) / 3600,
              (sla_due_at < now())
            FROM grievances
            WHERE department_id = :dept_id
              AND status NOT IN ('CLOSED','REJECTED_SPAM')
            ORDER BY (sla_due_at < now()) DESC, sla_due_at ASC NULLS LAST
        """),
                {"dept_id": str(department_id)},
            )
        ).fetchall()
        return [_row_to_summary(r) for r in rows]

    # ── Officer actions ───────────────────────────────────────────────────────

    async def claim(self, grievance_id: uuid.UUID, actor: TokenClaims) -> dict:
        g = await self._s.get(Grievance, grievance_id)
        if not g:
            raise ValueError("Grievance not found")
        allowed = {GrievanceStatus.ASSIGNED.value, GrievanceStatus.ESCALATED.value}
        if g.status not in allowed:
            raise ValueError(f"Cannot claim from status '{g.status}'")
        await self._repo.transition_status(
            g,
            GrievanceStatus.IN_PROGRESS,
            actor_id=actor.user_id,
            actor_role=actor.role,
            note="Officer claimed the grievance",
        )
        await self._outbox.emit(
            "grievance.in_progress",
            "grievance",
            str(grievance_id),
            {"grievance_id": str(grievance_id), "officer_id": actor.user_id},
        )
        return {"status": "IN_PROGRESS"}

    async def mark_action_taken(
        self, grievance_id: uuid.UUID, actor: TokenClaims, note: str
    ) -> dict:
        g = await self._s.get(Grievance, grievance_id)
        if not g:
            raise ValueError("Grievance not found")
        if g.status != GrievanceStatus.IN_PROGRESS.value:
            raise ValueError(f"Cannot mark action-taken from status '{g.status}'")
        await self._repo.transition_status(
            g,
            GrievanceStatus.ACTION_TAKEN,
            actor_id=actor.user_id,
            actor_role=actor.role,
            note=note or "Work completed on site",
        )
        return {"status": "ACTION_TAKEN"}

    async def resolve(
        self,
        grievance_id: uuid.UUID,
        actor: TokenClaims,
        body: ClosureRequest,
    ) -> dict:
        g = await self._s.get(Grievance, grievance_id)
        if not g:
            raise ValueError("Grievance not found")
        if g.status not in (GrievanceStatus.IN_PROGRESS.value, GrievanceStatus.ACTION_TAKEN.value):
            raise ValueError(f"Cannot resolve from status '{g.status}'")

        # Proof gate — un-fakeable
        proof = await self.verify_proof(grievance_id)
        if not proof.is_valid:
            raise ValueError("Closure blocked: " + "; ".join(proof.reasons))

        await self._repo.transition_status(
            g,
            GrievanceStatus.RESOLVED,
            actor_id=actor.user_id,
            actor_role=actor.role,
            note=body.resolution_note,
        )
        await self._outbox.emit(
            "grievance.resolved",
            "grievance",
            str(grievance_id),
            {"grievance_id": str(grievance_id), "officer_id": actor.user_id},
        )
        await self._audit.log(
            action="grievance.resolved",
            resource_type="grievance",
            resource_id=str(grievance_id),
            actor_id=actor.user_id,
            actor_role=actor.role,
        )
        log.info("workforce.resolved", grievance_id=str(grievance_id), officer=actor.user_id)
        return {"status": "RESOLVED", "proof": proof.model_dump()}

    async def add_note(
        self, grievance_id: uuid.UUID, actor: TokenClaims, body: OfficerNoteCreate
    ) -> OfficerNoteRead:
        g = await self._s.get(Grievance, grievance_id)
        if not g:
            raise ValueError("Grievance not found")

        note = OfficerNote(
            grievance_id=grievance_id,
            officer_id=actor.user_id,
            note=body.note,
            is_handoff=body.is_handoff,
            handoff_dept_id=body.handoff_dept_id,
        )
        self._s.add(note)
        await self._s.flush()

        if body.is_handoff and body.handoff_dept_id:
            await self._s.execute(
                text("""
                UPDATE grievances SET
                  department_id = :dept_id, assigned_officer_id = NULL,
                  status = 'CLASSIFIED', updated_at = now()
                WHERE id = :id
            """),
                {"dept_id": str(body.handoff_dept_id), "id": str(grievance_id)},
            )
            self._s.add(
                StatusEvent(
                    grievance_id=grievance_id,
                    from_status=g.status,
                    to_status=GrievanceStatus.CLASSIFIED.value,
                    actor_id=actor.user_id,
                    actor_role=actor.role,
                    note=f"Handed off to dept {body.handoff_dept_id}: {body.note}",
                )
            )
            await self._outbox.emit(
                "grievance.handoff",
                "grievance",
                str(grievance_id),
                {"new_dept_id": str(body.handoff_dept_id)},
            )

        return OfficerNoteRead.model_validate(note)

    async def request_info(self, grievance_id: uuid.UUID, actor: TokenClaims, message: str) -> dict:
        g = await self._s.get(Grievance, grievance_id)
        if not g:
            raise ValueError("Grievance not found")
        self._s.add(
            OfficerNote(
                grievance_id=grievance_id,
                officer_id=actor.user_id,
                note=f"[INFO REQUEST] {message}",
            )
        )
        await self._outbox.emit(
            "grievance.info_requested",
            "grievance",
            str(grievance_id),
            {"message": message, "citizen_phone": g.citizen_phone},
        )
        await self._s.flush()
        return {"status": "info_requested"}

    async def escalate(self, grievance_id: uuid.UUID, actor: TokenClaims, reason: str) -> dict:
        """
        Manually escalate a grievance up the ladder (officer/nodal-triggered).

        Mirrors the SLA worker's auto-escalation: bumps escalation_level, sets
        status=ESCALATED, writes a StatusEvent + EscalationRecord, emits the
        grievance.escalated outbox event. Capped at level 3 (cm_cell).
        """
        from app.modules.sla.service import ESCALATION_ROLES

        g = await self._s.get(Grievance, grievance_id)
        if not g:
            raise ValueError("Grievance not found")
        terminal = {
            GrievanceStatus.CLOSED.value,
            GrievanceStatus.RESOLVED.value,
            GrievanceStatus.VERIFIED.value,
            GrievanceStatus.REJECTED_SPAM.value,
        }
        if g.status in terminal:
            raise ValueError(f"Cannot escalate from status '{g.status}'")
        if g.escalation_level >= 3:
            raise ValueError("Already at the highest escalation level (cm_cell)")

        next_level = g.escalation_level + 1
        escalated_to_role = ESCALATION_ROLES.get(next_level, "cm_cell")
        from_status = g.status

        await self._s.execute(
            text("""
                UPDATE grievances SET
                  escalation_level = :lvl,
                  status = 'ESCALATED',
                  updated_at = now()
                WHERE id = :id
            """),
            {"lvl": next_level, "id": str(grievance_id)},
        )

        from app.modules.sla.models import EscalationRecord

        self._s.add(
            StatusEvent(
                grievance_id=grievance_id,
                from_status=from_status,
                to_status=GrievanceStatus.ESCALATED.value,
                actor_id=actor.user_id,
                actor_role=actor.role,
                note=f"Manually escalated to {escalated_to_role} (level {next_level}): {reason}",
            )
        )
        self._s.add(
            EscalationRecord(
                grievance_id=grievance_id,
                level=next_level,
                escalated_to_role=escalated_to_role,
                reason=f"Manual: {reason}",
            )
        )
        await self._outbox.emit(
            "grievance.escalated",
            "grievance",
            str(grievance_id),
            {
                "grievance_id": str(grievance_id),
                "level": next_level,
                "escalated_to_role": escalated_to_role,
                "manual": True,
                "actor_id": actor.user_id,
            },
        )
        await self._audit.log(
            action="grievance.escalated",
            resource_type="grievance",
            resource_id=str(grievance_id),
            actor_id=actor.user_id,
            actor_role=actor.role,
        )
        log.info(
            "workforce.escalated",
            grievance_id=str(grievance_id),
            level=next_level,
            actor=actor.user_id,
        )
        return {"status": "ESCALATED", "escalation_level": next_level, "to_role": escalated_to_role}

    async def get_notes(self, grievance_id: uuid.UUID) -> list[OfficerNoteRead]:
        res = await self._s.execute(
            select(OfficerNote)
            .where(OfficerNote.grievance_id == grievance_id)
            .order_by(OfficerNote.created_at)
        )
        return [OfficerNoteRead.model_validate(n) for n in res.scalars().all()]

    # ── Proof verification ────────────────────────────────────────────────────

    async def verify_proof(self, grievance_id: uuid.UUID) -> ProofVerificationResult:
        res = await self._s.execute(
            select(Attachment).where(
                Attachment.grievance_id == grievance_id,
                Attachment.is_proof.is_(True),
            )
        )
        proofs = list(res.scalars().all())
        before = [p for p in proofs if p.proof_type == "before"]
        after = [p for p in proofs if p.proof_type == "after"]

        reasons: list[str] = []
        has_before, has_after = bool(before), bool(after)
        geo_ok = timestamp_ok = True
        geo_dist: float | None = None

        if not has_before:
            reasons.append("No 'before' proof photo")
        if not has_after:
            reasons.append("No 'after' proof photo")

        if has_after:
            g = await self._s.get(Grievance, grievance_id)
            latest = max(after, key=lambda a: a.created_at)

            if g and latest.created_at <= g.created_at:
                timestamp_ok = False
                reasons.append("After-proof timestamp ≤ complaint creation time")

            if g and g.latitude and g.longitude and latest.exif_lat and latest.exif_lng:
                geo_dist = _haversine_m(g.latitude, g.longitude, latest.exif_lat, latest.exif_lng)
                if geo_dist > GEO_TOLERANCE_M:
                    geo_ok = False
                    reasons.append(f"Proof photo is {geo_dist:.0f}m away (max {GEO_TOLERANCE_M}m)")

        return ProofVerificationResult(
            is_valid=has_before and has_after and geo_ok and timestamp_ok,
            has_before=has_before,
            has_after=has_after,
            geo_distance_m=geo_dist,
            geo_ok=geo_ok,
            timestamp_ok=timestamp_ok,
            reasons=reasons,
        )

    # ── Dept-admin workload ───────────────────────────────────────────────────

    async def get_workload(self, department_id: uuid.UUID) -> list[WorkloadSummary]:
        rows = (
            await self._s.execute(
                text("""
            SELECT o.id, u.name, o.department_id, o.is_available,
              COUNT(g.id) FILTER (
                WHERE g.status NOT IN ('CLOSED','REJECTED_SPAM','RESOLVED','VERIFIED')
              ) AS total_assigned,
              COUNT(g.id) FILTER (WHERE g.status = 'IN_PROGRESS') AS in_progress,
              COUNT(g.id) FILTER (
                WHERE g.sla_due_at < now()
                  AND g.status NOT IN ('CLOSED','REJECTED_SPAM','RESOLVED','VERIFIED')
              ) AS sla_breached,
              ROUND(AVG(
                EXTRACT(EPOCH FROM (g.closed_at - g.created_at)) / 3600
              ) FILTER (WHERE g.closed_at IS NOT NULL)::numeric, 1) AS avg_hours
            FROM officers o
            JOIN users u ON u.id = o.user_id
            LEFT JOIN grievances g ON g.assigned_officer_id = o.id
            WHERE o.department_id = :dept_id
            GROUP BY o.id, u.name, o.department_id, o.is_available
            ORDER BY sla_breached DESC, total_assigned DESC
        """),
                {"dept_id": str(department_id)},
            )
        ).fetchall()
        return [
            WorkloadSummary(
                officer_id=uuid.UUID(str(r[0])),
                officer_name=r[1],
                department_id=uuid.UUID(str(r[2])),
                is_available=r[3],
                total_assigned=int(r[4] or 0),
                in_progress=int(r[5] or 0),
                sla_breached=int(r[6] or 0),
                avg_resolution_hours=float(r[7]) if r[7] else None,
            )
            for r in rows
        ]


def _row_to_summary(r: tuple) -> GrievanceSummary:
    return GrievanceSummary(
        id=uuid.UUID(str(r[0])),
        tracking_id=r[1],
        raw_text=r[2][:120] + "…" if len(r[2]) > 120 else r[2],
        category=r[3],
        subcategory=r[4],
        severity=r[5],
        status=r[6],
        priority=r[7],
        ward_id=uuid.UUID(str(r[8])) if r[8] else None,
        latitude=r[9],
        longitude=r[10],
        sla_due_at=r[11],
        escalation_level=r[12],
        is_emergency=r[13],
        created_at=r[14],
        updated_at=r[15],
        hours_until_breach=round(float(r[16]), 1) if r[16] is not None else None,
        is_sla_breached=bool(r[17]),
    )
