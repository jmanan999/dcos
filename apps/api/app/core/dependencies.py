"""
FastAPI dependency injection — auth, permissions, RLS-aware DB sessions.

Dependency chain:
  bearer token
    → get_current_user (JWT decode → TokenClaims)
      → require_permission (permission matrix check)
        → get_rls_db (sets app.* session vars for RLS enforcement)
"""
from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import TokenClaims, decode_token
from app.core.database import get_db
from app.core.permissions import has_permission

log = structlog.get_logger()

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> TokenClaims:
    """
    Decode and validate the Bearer token.  Works with both Supabase JWTs and
    locally-issued tokens (same JWT_SECRET).  Returns TokenClaims on success.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = decode_token(credentials.credentials)
        return claims
    except JWTError as exc:
        log.warning("auth.jwt.invalid", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> TokenClaims | None:
    """
    Like get_current_user but returns None instead of 401 when no token is present.
    Use on endpoints that support both anonymous and authenticated callers (e.g. intake).
    """
    if credentials is None:
        return None
    try:
        return decode_token(credentials.credentials)
    except JWTError:
        return None


def require_permission(permission: str):
    """
    Dependency factory.  Usage:
        @router.get("/...", dependencies=[Depends(require_permission(P.GRIEVANCE_READ_DEPT))])
    Or inject the verified user:
        user: Annotated[TokenClaims, Depends(require_permission(P.GRIEVANCE_RESOLVE))]
    """
    async def _guard(
        user: Annotated[TokenClaims, Depends(get_current_user)],
    ) -> TokenClaims:
        if not has_permission(user.role, permission):
            log.warning(
                "authz.denied",
                role=user.role,
                permission=permission,
                user_id=user.user_id,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' lacks permission '{permission}'",
            )
        return user

    return _guard


def require_department_match(permission: str):
    """
    Combines permission check + department isolation.
    Officers/dept_admins can only operate on their own department.
    district_officer / cm_cell / super_admin bypass the dept check.
    """
    async def _guard(
        user: Annotated[TokenClaims, Depends(require_permission(permission))],
    ) -> TokenClaims:
        # Roles that are scoped to a department must have a department_id claim
        scoped_roles = {"field_officer", "dept_admin"}
        if user.role in scoped_roles and not user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Department-scoped role has no department_id claim in token",
            )
        return user

    return _guard


async def get_rls_db(
    user: Annotated[TokenClaims, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AsyncSession:
    """
    Returns an AsyncSession with PostgreSQL session-level variables set so that
    Row Level Security policies can read them via current_setting().

    SET LOCAL scopes the variables to the current transaction only.
    Variables are cleared automatically when the transaction ends.
    """
    dept_id = user.department_id or ""
    await session.execute(
        text("SELECT set_config('app.user_id', :uid, true)"),
        {"uid": user.user_id},
    )
    await session.execute(
        text("SELECT set_config('app.user_role', :role, true)"),
        {"role": user.role},
    )
    await session.execute(
        text("SELECT set_config('app.department_id', :dept, true)"),
        {"dept": dept_id},
    )
    return session


# ── Typed shorthand annotations ───────────────────────────────────────────────

CurrentUser      = Annotated[TokenClaims, Depends(get_current_user)]
OptionalUser     = Annotated[TokenClaims | None, Depends(get_optional_user)]
DbSession        = Annotated[AsyncSession, Depends(get_db)]
RlsDbSession     = Annotated[AsyncSession, Depends(get_rls_db)]
