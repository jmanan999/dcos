"""Platform repositories — outbox relay, audit writes, ward/district lookups."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.platform.models import AuditLog, District, OutboxEvent, Ward, Zone


class OutboxRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def emit(
        self,
        event_type: str,
        aggregate_type: str,
        aggregate_id: str,
        payload: dict[str, Any],
    ) -> OutboxEvent:
        event = OutboxEvent(
            event_type=event_type,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            payload=payload,
        )
        self._s.add(event)
        return event

    async def claim_unprocessed(self, limit: int = 50) -> list[OutboxEvent]:
        result = await self._s.execute(
            select(OutboxEvent)
            .where(OutboxEvent.processed_at.is_(None))
            .order_by(OutboxEvent.created_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        return list(result.scalars().all())

    async def mark_processed(self, event_id: uuid.UUID) -> None:
        await self._s.execute(
            update(OutboxEvent)
            .where(OutboxEvent.id == event_id)
            .values(processed_at=datetime.now(UTC))
        )


class AuditRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def log(
        self,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        actor_id: str | None = None,
        actor_role: str | None = None,
        old_value: dict[str, Any] | None = None,
        new_value: dict[str, Any] | None = None,
        ip_address: str | None = None,
        request_id: str | None = None,
    ) -> None:
        self._s.add(
            AuditLog(
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                actor_id=actor_id,
                actor_role=actor_role,
                old_value=old_value,
                new_value=new_value,
                ip_address=ip_address,
                request_id=request_id,
            )
        )


class GeoRepository:
    """Read-only access to reference geo tables."""

    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_ward(self, ward_id: uuid.UUID) -> Ward | None:
        result = await self._s.execute(select(Ward).where(Ward.id == ward_id))
        return result.scalar_one_or_none()

    async def find_ward_by_name(self, name: str) -> Ward | None:
        result = await self._s.execute(select(Ward).where(Ward.name == name))
        return result.scalar_one_or_none()

    async def list_wards_in_district(self, district_id: uuid.UUID) -> list[Ward]:
        result = await self._s.execute(
            select(Ward).where(Ward.district_id == district_id).order_by(Ward.number)
        )
        return list(result.scalars().all())

    async def get_district(self, district_id: uuid.UUID) -> District | None:
        result = await self._s.execute(select(District).where(District.id == district_id))
        return result.scalar_one_or_none()

    async def list_zones(self) -> list[Zone]:
        result = await self._s.execute(select(Zone).order_by(Zone.name))
        return list(result.scalars().all())
