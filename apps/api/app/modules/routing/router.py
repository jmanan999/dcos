from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import RlsDbSession, require_permission
from app.core.permissions import P
from app.modules.routing.schemas import AssignmentResult
from app.modules.routing.service import RoutingService

router = APIRouter(prefix="/routing", tags=["Routing"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "routing", "status": "ok"}


@router.post(
    "/assign/{grievance_id}",
    response_model=AssignmentResult,
    summary="Assign a classified grievance to an officer (dept_admin+)",
)
async def assign_grievance(
    grievance_id: uuid.UUID,
    user: Annotated[object, Depends(require_permission(P.GRIEVANCE_ASSIGN))],
    session: RlsDbSession,
) -> AssignmentResult:
    from sqlalchemy import text
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = RoutingService(session)
    return await svc.assign(grievance_id)


@router.post(
    "/reassign/{grievance_id}",
    response_model=AssignmentResult,
    summary="Re-route a grievance (wrong dept / officer unavailable)",
)
async def reassign_grievance(
    grievance_id: uuid.UUID,
    reason: str,
    user: Annotated[object, Depends(require_permission(P.GRIEVANCE_ASSIGN))],
    session: RlsDbSession,
) -> AssignmentResult:
    from sqlalchemy import text
    from app.core.auth import TokenClaims
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    assert isinstance(user, TokenClaims)
    svc = RoutingService(session)
    return await svc.reassign(grievance_id, reason=reason, actor_id=user.user_id)
