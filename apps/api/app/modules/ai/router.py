from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import RlsDbSession, require_permission
from app.core.permissions import P
from app.modules.ai.schemas import AIEnrichmentResult, FeedbackLabelCreate
from app.modules.ai.service import AIService

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "ai", "status": "ok"}


@router.post(
    "/enrich/{grievance_id}",
    response_model=AIEnrichmentResult,
    summary="Manually trigger AI enrichment (admin / testing)",
)
async def enrich_grievance(
    grievance_id: uuid.UUID,
    user: Annotated[object, Depends(require_permission(P.GRIEVANCE_READ_DEPT))],
    session: RlsDbSession,
) -> AIEnrichmentResult:
    from sqlalchemy import text

    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = AIService(session)
    result = await svc.enrich(grievance_id)
    if not result:
        raise HTTPException(status_code=404, detail="Grievance not found")
    return result


@router.post(
    "/feedback",
    summary="Officer submits a category/department correction (labeled data)",
)
async def record_feedback(
    body: FeedbackLabelCreate,
    user: Annotated[object, Depends(require_permission(P.GRIEVANCE_RESOLVE))],
    session: RlsDbSession,
) -> dict[str, str]:
    from app.core.auth import TokenClaims

    assert isinstance(user, TokenClaims)
    svc = AIService(session)
    await svc.record_correction(body, officer_id=user.user_id)
    return {"status": "recorded"}
