from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_permission
from app.core.permissions import P
from app.modules.integration.service import IntegrationService

router = APIRouter(prefix="/integration", tags=["Integration"])

_IntegrationAuth = Annotated[object, Depends(require_permission(P.GRIEVANCE_READ_ANY))]


async def _get_svc(db: AsyncSession = Depends(get_db)) -> IntegrationService:
    await db.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    return IntegrationService(db)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "integration", "status": "ok"}


@router.get("/adapters")
async def list_adapters(
    _: _IntegrationAuth,
    svc: IntegrationService = Depends(_get_svc),
) -> list[dict]:
    """List registered department adapters."""
    return await svc.get_adapter_status()


@router.post("/push/{grievance_id}")
async def push_status(
    grievance_id: uuid.UUID,
    _: _IntegrationAuth,
    svc: IntegrationService = Depends(_get_svc),
) -> dict[str, str]:
    """Push the current grievance status to the department's external system."""
    result = await svc._db.execute(
        text("SELECT status FROM grievances WHERE id = CAST(:id AS uuid)"),
        {"id": str(grievance_id)},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Grievance not found")
    return await svc.push_status_to_dept(grievance_id, row[0])
