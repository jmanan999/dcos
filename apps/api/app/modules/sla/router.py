from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import RlsDbSession, require_permission
from app.core.permissions import P
from app.modules.sla.schemas import SLAStatus
from app.modules.sla.service import SLAService

router = APIRouter(prefix="/sla", tags=["SLA"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "sla", "status": "ok"}


@router.get(
    "/status/{grievance_id}",
    response_model=SLAStatus,
    summary="Get SLA status and breach info for a grievance",
)
async def sla_status(
    grievance_id: uuid.UUID,
    user: Annotated[object, Depends(require_permission(P.GRIEVANCE_READ_DEPT))],
    session: RlsDbSession,
) -> SLAStatus:
    from sqlalchemy import text

    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = SLAService(session)
    data = await svc.get_sla_status(grievance_id)
    if not data:
        raise HTTPException(status_code=404, detail="Grievance not found")
    return SLAStatus(
        grievance_id=grievance_id,
        sla_due_at=data.get("sla_due_at"),
        escalation_level=data.get("escalation_level", 0),
        status=data.get("status", ""),
        is_breached=data.get("is_breached", False),
        hours_remaining=data.get("hours_remaining"),
    )


@router.post(
    "/check-breaches",
    summary="Manually trigger SLA breach check + escalation (admin/testing)",
)
async def check_breaches(
    user: Annotated[object, Depends(require_permission(P.GRIEVANCE_ESCALATE))],
    session: RlsDbSession,
) -> dict:
    from sqlalchemy import text

    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = SLAService(session)
    return await svc.check_and_escalate()
