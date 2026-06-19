from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import CurrentUser, RlsDbSession, require_permission
from app.core.permissions import P
from app.modules.workforce.schemas import (
    ClosureRequest,
    GrievanceSummary,
    OfficerNoteCreate,
    OfficerNoteRead,
    ProofVerificationResult,
    RequestInfoRequest,
    WorkloadSummary,
)
from app.modules.workforce.service import WorkforceService

router = APIRouter(prefix="/workforce", tags=["Workforce"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "workforce", "status": "ok"}


def _bypass(session: RlsDbSession):
    """Helper imported inline to avoid circular; sets bypass in handler."""
    return session


# ── Officer queue ─────────────────────────────────────────────────────────────

@router.get("/queue", response_model=list[GrievanceSummary])
async def my_queue(
    user: CurrentUser,
    session: RlsDbSession,
) -> list[GrievanceSummary]:
    """Officer's personal queue — sorted by SLA breach then severity."""
    from sqlalchemy import text
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))

    # Resolve officer_id from user_id
    officer_row = (await session.execute(
        text("SELECT id FROM officers WHERE user_id = :uid LIMIT 1"),
        {"uid": user.user_id},
    )).fetchone()
    if not officer_row:
        return []

    svc = WorkforceService(session)
    return await svc.get_queue(uuid.UUID(str(officer_row[0])))


@router.get("/dept-queue", response_model=list[GrievanceSummary])
async def dept_queue(
    user: Annotated[object, Depends(require_permission(P.OFFICER_READ_DEPT))],
    session: RlsDbSession,
    dept_id: uuid.UUID | None = Query(None),
) -> list[GrievanceSummary]:
    """All open grievances for a department (dept_admin + above)."""
    from sqlalchemy import text
    from app.core.auth import TokenClaims
    assert isinstance(user, TokenClaims)
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))

    target = dept_id or (uuid.UUID(user.department_id) if user.department_id else None)
    if not target:
        raise HTTPException(status_code=400, detail="department_id required")
    svc = WorkforceService(session)
    return await svc.get_dept_queue(target)


# ── Grievance actions ─────────────────────────────────────────────────────────

@router.post("/grievances/{grievance_id}/claim")
async def claim(
    grievance_id: uuid.UUID,
    user: CurrentUser,
    session: RlsDbSession,
) -> dict:
    """Officer claims a grievance (ASSIGNED → IN_PROGRESS)."""
    from sqlalchemy import text
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = WorkforceService(session)
    try:
        return await svc.claim(grievance_id, user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/grievances/{grievance_id}/action-taken")
async def mark_action_taken(
    grievance_id: uuid.UUID,
    body: dict,
    user: CurrentUser,
    session: RlsDbSession,
) -> dict:
    """Mark work done on site (IN_PROGRESS → ACTION_TAKEN)."""
    from sqlalchemy import text
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = WorkforceService(session)
    try:
        return await svc.mark_action_taken(grievance_id, user, body.get("note", ""))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/grievances/{grievance_id}/resolve")
async def resolve(
    grievance_id: uuid.UUID,
    body: ClosureRequest,
    user: Annotated[object, Depends(require_permission(P.GRIEVANCE_RESOLVE))],
    session: RlsDbSession,
) -> dict:
    """
    Resolve a grievance. Blocked if before+after proof is missing or
    after-proof geo is >500m from complaint location.
    """
    from sqlalchemy import text
    from app.core.auth import TokenClaims
    assert isinstance(user, TokenClaims)
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = WorkforceService(session)
    try:
        return await svc.resolve(grievance_id, user, body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/grievances/{grievance_id}/proof", response_model=ProofVerificationResult)
async def check_proof(
    grievance_id: uuid.UUID,
    user: CurrentUser,
    session: RlsDbSession,
) -> ProofVerificationResult:
    """Check proof status before attempting to resolve."""
    from sqlalchemy import text
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = WorkforceService(session)
    return await svc.verify_proof(grievance_id)


@router.post("/grievances/{grievance_id}/notes", response_model=OfficerNoteRead)
async def add_note(
    grievance_id: uuid.UUID,
    body: OfficerNoteCreate,
    user: CurrentUser,
    session: RlsDbSession,
) -> OfficerNoteRead:
    """Add an internal note. If is_handoff=True, re-routes to handoff_dept_id."""
    from sqlalchemy import text
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = WorkforceService(session)
    try:
        return await svc.add_note(grievance_id, user, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/grievances/{grievance_id}/notes", response_model=list[OfficerNoteRead])
async def get_notes(
    grievance_id: uuid.UUID,
    user: CurrentUser,
    session: RlsDbSession,
) -> list[OfficerNoteRead]:
    from sqlalchemy import text
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = WorkforceService(session)
    return await svc.get_notes(grievance_id)


@router.post("/grievances/{grievance_id}/request-info")
async def request_info(
    grievance_id: uuid.UUID,
    body: RequestInfoRequest,
    user: CurrentUser,
    session: RlsDbSession,
) -> dict:
    from sqlalchemy import text
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    svc = WorkforceService(session)
    try:
        return await svc.request_info(grievance_id, user, body.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Dept-admin workload view ──────────────────────────────────────────────────

@router.get("/workload", response_model=list[WorkloadSummary])
async def dept_workload(
    user: Annotated[object, Depends(require_permission(P.OFFICER_READ_DEPT))],
    session: RlsDbSession,
    dept_id: uuid.UUID | None = Query(None),
) -> list[WorkloadSummary]:
    """Officer workload summary for dept_admin / district_officer / cm_cell."""
    from sqlalchemy import text
    from app.core.auth import TokenClaims
    assert isinstance(user, TokenClaims)
    await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    target = dept_id or (uuid.UUID(user.department_id) if user.department_id else None)
    if not target:
        raise HTTPException(status_code=400, detail="department_id required")
    svc = WorkforceService(session)
    return await svc.get_workload(target)
