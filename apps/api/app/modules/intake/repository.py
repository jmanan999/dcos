"""Intake repository — grievance CRUD and state-machine transitions."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.intake.models import (
    Grievance,
    GrievanceCluster,
    GrievanceStatus,
    StatusEvent,
)


class GrievanceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get(self, grievance_id: uuid.UUID) -> Grievance | None:
        result = await self._s.execute(
            select(Grievance).where(Grievance.id == grievance_id)
        )
        return result.scalar_one_or_none()

    async def get_by_tracking_id(self, tracking_id: str) -> Grievance | None:
        result = await self._s.execute(
            select(Grievance).where(Grievance.tracking_id == tracking_id)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: object) -> Grievance:
        grievance = Grievance(**kwargs)
        self._s.add(grievance)
        await self._s.flush()
        return grievance

    async def transition_status(
        self,
        grievance: Grievance,
        to_status: GrievanceStatus,
        actor_id: str | None,
        actor_role: str | None = None,
        note: str | None = None,
    ) -> StatusEvent:
        allowed = GrievanceStatus.allowed_transitions()[GrievanceStatus(grievance.status)]
        if to_status not in allowed:
            raise ValueError(
                f"Illegal transition: {grievance.status} → {to_status.value}"
            )
        event = StatusEvent(
            grievance_id=grievance.id,
            from_status=grievance.status,
            to_status=to_status.value,
            actor_id=actor_id,
            actor_role=actor_role,
            note=note,
        )
        grievance.status = to_status.value
        grievance.updated_at = datetime.now(UTC)
        if to_status in (GrievanceStatus.CLOSED, GrievanceStatus.REJECTED_SPAM):
            grievance.closed_at = datetime.now(UTC)
        self._s.add(event)
        await self._s.flush()
        return event

    async def list_by_department(
        self,
        dept_id: uuid.UUID,
        status: GrievanceStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Grievance]:
        q = select(Grievance).where(Grievance.department_id == dept_id)
        if status:
            q = q.where(Grievance.status == status.value)
        q = q.order_by(Grievance.sla_due_at.asc().nulls_last()).limit(limit).offset(offset)
        result = await self._s.execute(q)
        return list(result.scalars().all())

    async def list_sla_approaching(self, within_hours: int = 4) -> list[Grievance]:
        """Grievances whose SLA expires within `within_hours` and are not yet closed."""
        cutoff = func.now() + func.make_interval(0, 0, 0, 0, within_hours)
        result = await self._s.execute(
            select(Grievance)
            .where(
                Grievance.sla_due_at <= cutoff,
                Grievance.sla_due_at >= func.now(),
                Grievance.status.notin_(
                    [GrievanceStatus.CLOSED.value, GrievanceStatus.REJECTED_SPAM.value]
                ),
            )
            .order_by(Grievance.sla_due_at)
        )
        return list(result.scalars().all())

    async def get_status_timeline(self, grievance_id: uuid.UUID) -> list[StatusEvent]:
        result = await self._s.execute(
            select(StatusEvent)
            .where(StatusEvent.grievance_id == grievance_id)
            .order_by(StatusEvent.ts)
        )
        return list(result.scalars().all())


class ClusterRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get(self, cluster_id: uuid.UUID) -> GrievanceCluster | None:
        result = await self._s.execute(
            select(GrievanceCluster).where(GrievanceCluster.id == cluster_id)
        )
        return result.scalar_one_or_none()

    async def find_active(self, category: str, dept_id: uuid.UUID | None) -> GrievanceCluster | None:
        q = select(GrievanceCluster).where(
            GrievanceCluster.category == category,
            GrievanceCluster.is_active.is_(True),
        )
        if dept_id:
            q = q.where(GrievanceCluster.department_id == dept_id)
        result = await self._s.execute(q.limit(1))
        return result.scalar_one_or_none()
