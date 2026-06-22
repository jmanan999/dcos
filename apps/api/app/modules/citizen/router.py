from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_db
from app.modules.citizen.schemas import (
    FeedbackCreate,
    FeedbackRead,
    PublicKPISnapshot,
    ReopenRequest,
)
from app.modules.citizen.service import CitizenService

router = APIRouter(prefix="/citizen", tags=["Citizen"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "citizen", "status": "ok"}


@router.post("/feedback/{grievance_id}", response_model=FeedbackRead)
async def submit_feedback(
    grievance_id: uuid.UUID,
    body: FeedbackCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> FeedbackRead:
    """Submit CSAT rating after a complaint is resolved."""
    await db.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = CitizenService(db)
    result = await svc.submit_feedback(
        grievance_id=grievance_id,
        rating=body.rating,
        comment=body.comment,
        citizen_id=current_user.user_id,
    )
    await db.commit()
    return result


@router.post("/reopen/{grievance_id}")
async def reopen_grievance(
    grievance_id: uuid.UUID,
    body: ReopenRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Citizen rejects a resolution and requests reopening."""
    await db.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = CitizenService(db)
    result = await svc.reopen(
        grievance_id=grievance_id,
        reason=body.reason,
        citizen_id=current_user.user_id,
    )
    await db.commit()
    return result


@router.get("/public-stats", response_model=PublicKPISnapshot)
async def public_stats(db: AsyncSession = Depends(get_db)) -> PublicKPISnapshot:
    """Anonymized, real-time stats for the public transparency dashboard. No auth required."""
    import logging
    log = logging.getLogger(__name__)
    try:
        await db.execute(text("SELECT set_config('app.bypass_rls', 'on', true)"))
    except Exception as exc:
        log.warning("bypass_rls set_config failed (non-fatal): %s", exc)
    svc = CitizenService(db)
    return await svc.get_public_stats()
