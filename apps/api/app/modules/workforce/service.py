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
    CaseFileAttachment,
    CaseFileEvent,
    ChecklistStatus,
    ChecklistStep,
    ClosureRequest,
    FullCaseFile,
    GrievanceSummary,
    OfficerNoteCreate,
    OfficerNoteRead,
    OfficerScorecard,
    ProofVerificationResult,
    RouteCluster,
    RoutePlan,
    RouteStop,
    WorkloadSummary,
)

log = structlog.get_logger()

GEO_TOLERANCE_M = 500  # proof photo must be within 500m of grievance location

# E2.5 — categories that require video proof (large/high-value field work)
VIDEO_PROOF_CATEGORIES = {
    "Road Repair Required",
    "Sewage Overflow",
    "Flyover / Bridge Damage",
    "Pothole / Road Damage",
}


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

        # E2.4 — checklist gate: all quality steps must be complete
        checklist = await self.get_checklist(grievance_id)
        if checklist and not checklist.all_complete:
            pending = checklist.total - checklist.completed
            raise ValueError(
                f"Closure blocked: {pending} of {checklist.total} quality checklist "
                f"steps incomplete. Complete the checklist before resolving."
            )

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

    # ── E2.1: Route optimization ──────────────────────────────────────────────

    async def get_route_plan(self, officer_id: uuid.UUID) -> RoutePlan:
        """
        Group an officer's open complaints into geographic clusters for efficient
        field visits. Greedy clustering: complaints within ~1.2km share a cluster.
        """
        rows = (
            await self._s.execute(
                text("""
                SELECT g.id, g.tracking_id, g.category, g.latitude, g.longitude,
                       g.priority, (g.sla_due_at < now()) AS breached, w.name AS ward_name
                FROM grievances g
                LEFT JOIN wards w ON w.id = g.ward_id
                WHERE g.assigned_officer_id = :oid
                  AND g.status IN ('ASSIGNED','IN_PROGRESS','ACTION_TAKEN')
                ORDER BY (g.sla_due_at < now()) DESC, g.sla_due_at ASC NULLS LAST
            """),
                {"oid": str(officer_id)},
            )
        ).fetchall()

        located = [r for r in rows if r[3] is not None and r[4] is not None]
        unclustered = len(rows) - len(located)

        # Greedy geo-clustering — 1.2km radius
        CLUSTER_RADIUS_M = 1200
        clusters_raw: list[list[tuple]] = []
        for r in located:
            placed = False
            for cluster in clusters_raw:
                head = cluster[0]
                if _haversine_m(r[3], r[4], head[3], head[4]) <= CLUSTER_RADIUS_M:
                    cluster.append(r)
                    placed = True
                    break
            if not placed:
                clusters_raw.append([r])

        clusters: list[RouteCluster] = []
        for cluster in clusters_raw:
            stops = [
                RouteStop(
                    id=uuid.UUID(str(c[0])),
                    tracking_id=c[1],
                    category=c[2],
                    latitude=c[3],
                    longitude=c[4],
                    is_sla_breached=bool(c[6]),
                    priority=c[5],
                )
                for c in cluster
            ]
            # 25 min field work per stop + 10 min inter-stop travel within cluster
            est = len(stops) * 25 + max(0, len(stops) - 1) * 10
            ward_name = cluster[0][7]
            # Google Maps multi-stop directions URL
            waypoints = "/".join(f"{c[3]},{c[4]}" for c in cluster)
            maps_url = f"https://www.google.com/maps/dir/{waypoints}"
            clusters.append(
                RouteCluster(
                    label=ward_name or "Area cluster",
                    ward_name=ward_name,
                    stops=stops,
                    estimated_minutes=est,
                    google_maps_url=maps_url,
                )
            )

        # Sort clusters: breached cases first
        clusters.sort(key=lambda c: sum(1 for s in c.stops if s.is_sla_breached), reverse=True)

        total_stops = len(located)
        naive = total_stops * 55  # 25 min work + 30 min travel each, separately
        optimised = (
            sum(c.estimated_minutes for c in clusters) + len(clusters) * 25
        )  # +travel between clusters
        return RoutePlan(
            clusters=clusters,
            total_stops=total_stops,
            unclustered=unclustered,
            naive_minutes=naive,
            optimised_minutes=optimised,
            minutes_saved=max(0, naive - optimised),
        )

    # ── E2.2: Officer scorecard ───────────────────────────────────────────────

    async def get_officer_scorecard(self, officer_id: uuid.UUID) -> OfficerScorecard:
        """Personal performance metrics + department rank for an officer."""
        row = (
            await self._s.execute(
                text("""
                SELECT
                    o.id, u.name, o.department_id,
                    COUNT(g.id) FILTER (
                        WHERE g.status IN ('ASSIGNED','IN_PROGRESS','ACTION_TAKEN')
                    ) AS open_cases,
                    COUNT(g.id) FILTER (
                        WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')
                          AND g.closed_at >= now() - interval '7 days'
                    ) AS resolved_7d,
                    COUNT(g.id) FILTER (
                        WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')
                          AND g.closed_at >= now() - interval '30 days'
                    ) AS resolved_30d,
                    ROUND(AVG(
                        EXTRACT(EPOCH FROM (g.closed_at - g.created_at)) / 3600
                    ) FILTER (WHERE g.closed_at IS NOT NULL)::numeric, 1) AS avg_hours,
                    COUNT(g.id) FILTER (
                        WHERE g.sla_due_at < now()
                          AND g.status IN ('ASSIGNED','IN_PROGRESS','ACTION_TAKEN')
                    ) AS sla_breached,
                    COUNT(g.id) FILTER (WHERE g.status = 'REOPENED') AS reopened,
                    COUNT(g.id) FILTER (WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')) AS total_resolved
                FROM officers o
                JOIN users u ON u.id = o.user_id
                LEFT JOIN grievances g ON g.assigned_officer_id = o.id
                WHERE o.id = :oid
                GROUP BY o.id, u.name, o.department_id
            """),
                {"oid": str(officer_id)},
            )
        ).fetchone()

        if not row:
            raise ValueError("Officer not found")

        dept_id = row[2]
        open_cases = int(row[3] or 0)
        resolved_7d = int(row[4] or 0)
        resolved_30d = int(row[5] or 0)
        avg_hours = float(row[6]) if row[6] else None
        sla_breached = int(row[7] or 0)
        reopened = int(row[8] or 0)
        total_resolved = int(row[9] or 0)

        false_closure_rate = round(reopened / total_resolved * 100, 1) if total_resolved else 0.0

        # CSAT average for this officer's cases
        csat = (
            await self._s.execute(
                text("""
                SELECT ROUND(AVG(f.rating), 2)
                FROM feedback f
                JOIN grievances g ON g.id = f.grievance_id
                WHERE g.assigned_officer_id = :oid
            """),
                {"oid": str(officer_id)},
            )
        ).scalar()
        avg_csat = float(csat) if csat else None

        # Department rank — by resolved_30d desc, then breaches asc
        rank_rows = (
            await self._s.execute(
                text("""
                SELECT o.id,
                    COUNT(g.id) FILTER (
                        WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')
                          AND g.closed_at >= now() - interval '30 days'
                    ) AS r30,
                    COUNT(g.id) FILTER (
                        WHERE g.sla_due_at < now()
                          AND g.status IN ('ASSIGNED','IN_PROGRESS','ACTION_TAKEN')
                    ) AS breaches
                FROM officers o
                LEFT JOIN grievances g ON g.assigned_officer_id = o.id
                WHERE o.department_id = :dept
                GROUP BY o.id
                ORDER BY r30 DESC, breaches ASC
            """),
                {"dept": str(dept_id)},
            )
        ).fetchall()
        dept_total = len(rank_rows)
        dept_rank = next(
            (i + 1 for i, rr in enumerate(rank_rows) if str(rr[0]) == str(officer_id)), dept_total
        )

        # Grade: composite of resolution volume, breaches, false closures, CSAT
        score = (
            min(100, resolved_30d * 5) * 0.30
            + max(0, 100 - sla_breached * 15) * 0.30
            + max(0, 100 - false_closure_rate * 3) * 0.20
            + ((avg_csat or 3) / 5 * 100) * 0.20
        )
        grade = (
            "A"
            if score >= 80
            else "B"
            if score >= 65
            else "C"
            if score >= 50
            else "D"
            if score >= 35
            else "F"
        )

        return OfficerScorecard(
            officer_id=officer_id,
            officer_name=row[1],
            open_cases=open_cases,
            resolved_7d=resolved_7d,
            resolved_30d=resolved_30d,
            avg_resolution_hours=avg_hours,
            sla_breaches=sla_breached,
            false_closure_rate=false_closure_rate,
            avg_csat=avg_csat,
            dept_rank=dept_rank,
            dept_total_officers=dept_total,
            performance_grade=grade,
        )

    async def get_my_scorecard(self, user_id: str) -> OfficerScorecard:
        """Resolve officer_id from user_id, then return scorecard."""
        row = (
            await self._s.execute(
                text("SELECT id FROM officers WHERE user_id = :uid LIMIT 1"),
                {"uid": user_id},
            )
        ).fetchone()
        if not row:
            raise ValueError("No officer profile for this user")
        return await self.get_officer_scorecard(uuid.UUID(str(row[0])))

    # ── E2.3: Full case file ──────────────────────────────────────────────────

    async def get_full_case(self, grievance_id: uuid.UUID) -> FullCaseFile:
        """Complete grievance history for handoff context — everything the receiving officer needs."""
        g = await self._s.get(Grievance, grievance_id)
        if not g:
            raise ValueError("Grievance not found")

        # Attachments
        att_rows = (
            (
                await self._s.execute(
                    select(Attachment)
                    .where(Attachment.grievance_id == grievance_id)
                    .order_by(Attachment.created_at)
                )
            )
            .scalars()
            .all()
        )
        attachments = [
            CaseFileAttachment(
                url=a.url,
                file_type=a.file_type,
                is_proof=a.is_proof,
                proof_type=a.proof_type,
                created_at=a.created_at,
            )
            for a in att_rows
        ]

        # Notes
        notes = await self.get_notes(grievance_id)

        # Timeline
        ev_rows = (
            await self._s.execute(
                text("""
                SELECT from_status, to_status, actor_role, note, ts
                FROM status_events WHERE grievance_id = :gid ORDER BY ts ASC
            """),
                {"gid": str(grievance_id)},
            )
        ).fetchall()
        timeline = [
            CaseFileEvent(from_status=e[0], to_status=e[1], actor_role=e[2], note=e[3], ts=e[4])
            for e in ev_rows
        ]

        # Previous departments (handoff trail)
        dept_rows = (
            await self._s.execute(
                text("""
                SELECT DISTINCT d.name
                FROM officer_notes n
                JOIN departments d ON d.id = n.handoff_dept_id
                WHERE n.grievance_id = :gid AND n.is_handoff = true
            """),
                {"gid": str(grievance_id)},
            )
        ).fetchall()
        previous_departments = [r[0] for r in dept_rows]

        return FullCaseFile(
            tracking_id=g.tracking_id,
            raw_text=g.raw_text,
            category=g.category,
            subcategory=g.subcategory,
            status=g.status,
            priority=g.priority,
            latitude=g.latitude,
            longitude=g.longitude,
            created_at=g.created_at,
            attachments=attachments,
            notes=notes,
            timeline=timeline,
            previous_departments=previous_departments,
        )

    # ── E2.4: Checklists ──────────────────────────────────────────────────────

    async def get_checklist(self, grievance_id: uuid.UUID) -> ChecklistStatus | None:
        """Return the quality checklist for a grievance's category + completion state."""
        g = await self._s.get(Grievance, grievance_id)
        if not g or not g.category:
            return None

        steps_rows = (
            await self._s.execute(
                text("""
                SELECT id, step_order, step_label, step_label_hi, requires_photo
                FROM complaint_checklists
                WHERE category = :cat AND is_active = true
                ORDER BY step_order
            """),
                {"cat": g.category},
            )
        ).fetchall()
        if not steps_rows:
            return None

        completed_rows = (
            await self._s.execute(
                text("""
                SELECT checklist_id, note FROM checklist_completions
                WHERE grievance_id = :gid
            """),
                {"gid": str(grievance_id)},
            )
        ).fetchall()
        completed_map = {str(r[0]): r[1] for r in completed_rows}

        steps = [
            ChecklistStep(
                id=uuid.UUID(str(r[0])),
                step_order=r[1],
                step_label=r[2],
                step_label_hi=r[3],
                requires_photo=r[4],
                completed=str(r[0]) in completed_map,
                completed_note=completed_map.get(str(r[0])),
            )
            for r in steps_rows
        ]
        done = sum(1 for s in steps if s.completed)
        return ChecklistStatus(
            category=g.category,
            steps=steps,
            total=len(steps),
            completed=done,
            all_complete=done == len(steps),
        )

    async def complete_checklist_item(
        self, grievance_id: uuid.UUID, checklist_id: uuid.UUID, actor: TokenClaims, note: str | None
    ) -> dict:
        await self._s.execute(
            text("""
                INSERT INTO checklist_completions (id, grievance_id, checklist_id, officer_id, note)
                VALUES (uuid_generate_v4(), :gid, :cid, :oid, :note)
                ON CONFLICT (grievance_id, checklist_id)
                DO UPDATE SET note = EXCLUDED.note, completed_at = now()
            """),
            {
                "gid": str(grievance_id),
                "cid": str(checklist_id),
                "oid": actor.user_id,
                "note": note,
            },
        )
        await self._s.flush()
        return {"status": "completed"}


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
