"""
JWT utilities — token creation (local/test only) and token verification.

In production the frontend sends Supabase-issued JWTs.  The Supabase JWT has:
  - sub   : user UUID
  - role  : "authenticated"  (Supabase DB role, not our app role)
  - user_metadata.dcos_role        : our app role
  - user_metadata.department_id    : UUID string (officers/admins only)
  - user_metadata.name             : display name

For local dev & tests we issue our own JWTs (same secret) so we don't need
a live Supabase project to test authz.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from app.core.config import settings


class TokenClaims:
    """Normalised claims extracted from either a Supabase JWT or a local JWT."""

    def __init__(
        self,
        user_id: str,
        role: str,
        department_id: str | None = None,
        name: str | None = None,
    ) -> None:
        self.user_id = user_id
        self.role = role
        self.department_id = department_id
        self.name = name

    @property
    def is_citizen(self) -> bool:
        return self.role == "citizen"

    @property
    def is_officer(self) -> bool:
        return self.role in ("field_officer", "dept_admin")

    @property
    def is_admin(self) -> bool:
        return self.role in ("district_officer", "cm_cell", "super_admin")


def decode_token(token: str) -> TokenClaims:
    """
    Decode and validate a JWT, returning normalised claims.
    Handles both our local JWTs and Supabase-issued JWTs.
    Raises jose.JWTError on any validation failure.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "exp"]},
    )

    sub: str = payload["sub"]

    # Supabase puts app-level claims inside user_metadata
    user_meta: dict = payload.get("user_metadata") or {}

    role: str = (
        user_meta.get("dcos_role")
        or payload.get("role")
        or "citizen"
    )
    # Supabase's own "role" field is "authenticated" — treat that as citizen
    if role == "authenticated":
        role = user_meta.get("dcos_role", "citizen")

    dept_id: str | None = (
        user_meta.get("department_id")
        or payload.get("department_id")
        or None
    )

    name: str | None = (
        user_meta.get("name")
        or payload.get("name")
        or None
    )

    return TokenClaims(user_id=sub, role=role, department_id=dept_id, name=name)


def create_local_token(
    user_id: str | None = None,
    role: str = "citizen",
    department_id: str | None = None,
    name: str | None = None,
    expires_minutes: int | None = None,
) -> str:
    """
    Issue a signed JWT for local dev and tests.
    NEVER expose the /identity/token endpoint in production.
    """
    uid = user_id or str(uuid.uuid4())
    exp = datetime.now(UTC) + timedelta(
        minutes=expires_minutes or settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: dict = {
        "sub": uid,
        "role": role,
        "exp": exp,
    }
    if department_id:
        payload["department_id"] = department_id
    if name:
        payload["name"] = name
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_token_string(token: str) -> TokenClaims:
    """Thin wrapper — raises HTTPException-friendly JWTError on failure."""
    try:
        return decode_token(token)
    except JWTError:
        raise
