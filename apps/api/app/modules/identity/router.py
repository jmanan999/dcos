from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import create_local_token
from app.core.config import settings
from app.core.dependencies import CurrentUser, RlsDbSession, require_permission
from app.core.permissions import P, get_permissions
from app.modules.identity.schemas import (
    DepartmentRead,
    OfficerCreate,
    OfficerRead,
    OfficerUpdate,
    PermissionsResponse,
    PhoneClaimRequest,
    PhoneClaimResponse,
    TokenRequest,
    TokenResponse,
    UserRead,
    UserUpdate,
)
from app.modules.identity.service import IdentityService

router = APIRouter(prefix="/identity", tags=["Identity"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "identity", "status": "ok"}


# ── Dev-only token endpoint ───────────────────────────────────────────────────

@router.post(
    "/token",
    response_model=TokenResponse,
    summary="Issue a local JWT (local/staging only — disabled in production)",
)
async def issue_token(body: TokenRequest) -> TokenResponse:
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    uid = body.user_id or str(uuid.uuid4())
    token = create_local_token(
        user_id=uid,
        role=body.role,
        department_id=body.department_id,
        name=body.name,
    )
    return TokenResponse(
        access_token=token,
        role=body.role,
        user_id=uid,
        department_id=body.department_id,
    )


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserRead)
async def get_me(user: CurrentUser, session: RlsDbSession) -> UserRead:
    svc = IdentityService(session)
    db_user = await svc.upsert_me(user)
    return UserRead.model_validate(db_user)


@router.patch("/me", response_model=UserRead)
async def update_me(body: UserUpdate, user: CurrentUser, session: RlsDbSession) -> UserRead:
    svc = IdentityService(session)
    updated = await svc.update_me(
        user_id=uuid.UUID(user.user_id),
        name=body.name,
        language_pref=body.language_pref,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return UserRead.model_validate(updated)


@router.get("/me/permissions", response_model=PermissionsResponse)
async def my_permissions(user: CurrentUser) -> PermissionsResponse:
    return PermissionsResponse(
        role=user.role,
        permissions=sorted(get_permissions(user.role)),
    )


# ── Phone claim (link anonymous grievances) ────────────────────────────────────

@router.post("/me/claim-phone", response_model=PhoneClaimResponse)
async def claim_phone(
    body: PhoneClaimRequest,
    user: CurrentUser,
    session: RlsDbSession,
) -> PhoneClaimResponse:
    svc = IdentityService(session)
    linked = await svc.claim_anonymous_grievances(
        user_id=uuid.UUID(user.user_id), phone=body.phone
    )
    return PhoneClaimResponse(linked_grievances=linked)


# ── Departments ───────────────────────────────────────────────────────────────

@router.get("/departments", response_model=list[DepartmentRead])
async def list_departments(
    user: Annotated[object, Depends(require_permission(P.DEPARTMENT_READ))],
    session: RlsDbSession,
    active_only: bool = Query(True),
) -> list[DepartmentRead]:
    from app.core.auth import TokenClaims
    svc = IdentityService(session)
    depts = await svc.list_departments(active_only=active_only)
    return [DepartmentRead.model_validate(d) for d in depts]


@router.get("/departments/{dept_id}", response_model=DepartmentRead)
async def get_department(
    dept_id: uuid.UUID,
    user: Annotated[object, Depends(require_permission(P.DEPARTMENT_READ))],
    session: RlsDbSession,
) -> DepartmentRead:
    svc = IdentityService(session)
    dept = await svc.get_department(dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return DepartmentRead.model_validate(dept)


# ── Officers ──────────────────────────────────────────────────────────────────

@router.get("/officers", response_model=list[OfficerRead])
async def list_officers(
    user: Annotated[object, Depends(require_permission(P.OFFICER_READ_DEPT))],
    session: RlsDbSession,
    dept_id: uuid.UUID | None = Query(None),
) -> list[OfficerRead]:
    from app.core.auth import TokenClaims
    assert isinstance(user, object)
    svc = IdentityService(session)
    # Re-fetch the typed user from session
    from app.core.dependencies import get_current_user
    officers = await svc.list_officers(claims=user, dept_id=dept_id)  # type: ignore[arg-type]
    return [OfficerRead.model_validate(o) for o in officers]


@router.get("/officers/{officer_id}", response_model=OfficerRead)
async def get_officer(
    officer_id: uuid.UUID,
    user: Annotated[object, Depends(require_permission(P.OFFICER_READ_DEPT))],
    session: RlsDbSession,
) -> OfficerRead:
    svc = IdentityService(session)
    officer = await svc.get_officer(officer_id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    return OfficerRead.model_validate(officer)


@router.post(
    "/officers",
    response_model=OfficerRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_officer(
    body: OfficerCreate,
    user: Annotated[object, Depends(require_permission(P.OFFICER_MANAGE_DEPT))],
    session: RlsDbSession,
) -> OfficerRead:
    svc = IdentityService(session)
    officer = await svc.create_officer(
        user_id=body.user_id,
        department_id=body.department_id,
        designation=body.designation,
        employee_id=body.employee_id,
        max_active_cases=body.max_active_cases,
    )
    return OfficerRead.model_validate(officer)


@router.patch("/officers/{officer_id}", response_model=OfficerRead)
async def update_officer(
    officer_id: uuid.UUID,
    body: OfficerUpdate,
    user: Annotated[object, Depends(require_permission(P.OFFICER_MANAGE_DEPT))],
    session: RlsDbSession,
) -> OfficerRead:
    from app.core.auth import TokenClaims
    svc = IdentityService(session)
    officer = await svc.update_officer(
        officer_id=officer_id,
        claims=user,  # type: ignore[arg-type]
        designation=body.designation,
        is_available=body.is_available,
        max_active_cases=body.max_active_cases,
    )
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found or access denied")
    return OfficerRead.model_validate(officer)
