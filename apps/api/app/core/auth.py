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

import time
import uuid
from datetime import UTC, datetime, timedelta

import httpx
import structlog
from jose import JWTError, jwt

from app.core.config import settings

log = structlog.get_logger()

# ── Supabase JWKS cache (for verifying ES256/RS256 access tokens) ──────────────
_jwks_cache: dict[str, dict] = {}
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600  # 1 hour


def _supabase_jwks_url() -> str | None:
    if not settings.SUPABASE_URL or "your-project" in settings.SUPABASE_URL:
        return None
    return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _get_supabase_jwk(kid: str) -> dict | None:
    """Return the JWK matching `kid`, refreshing the cache if needed."""
    global _jwks_fetched_at
    now = time.time()
    if kid in _jwks_cache and now - _jwks_fetched_at < _JWKS_TTL:
        return _jwks_cache[kid]

    url = _supabase_jwks_url()
    if not url:
        return None
    try:
        resp = httpx.get(url, timeout=5)
        resp.raise_for_status()
        keys = resp.json().get("keys", [])
        _jwks_cache.clear()
        for k in keys:
            _jwks_cache[k["kid"]] = k
        _jwks_fetched_at = now
    except Exception as exc:
        log.warning("auth.jwks.fetch_failed", error=str(exc))
        return _jwks_cache.get(kid)  # serve stale on failure
    return _jwks_cache.get(kid)


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

    Supports two token families:
      - Local dev JWTs   → HS256 signed with JWT_SECRET (from /identity/token).
      - Supabase JWTs    → ES256/RS256 verified against the project's JWKS.

    The signing algorithm in the token header decides the path.
    Raises jose.JWTError on any validation failure.
    """
    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        raise
    alg = header.get("alg", settings.JWT_ALGORITHM)

    if alg == "HS256":
        # Local dev / test token
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
            options={"require": ["sub", "exp"]},
        )
    else:
        # Supabase-issued asymmetric token — verify against JWKS
        kid = header.get("kid")
        jwk_key = _get_supabase_jwk(kid) if kid else None
        if not jwk_key:
            raise JWTError(f"No JWKS key found for kid={kid}")
        payload = jwt.decode(
            token,
            jwk_key,
            algorithms=[alg],
            audience="authenticated",
            options={"require": ["sub", "exp"]},
        )

    sub: str = payload["sub"]

    # SECURITY: the app role MUST come from app_metadata (admin/service-key only).
    # user_metadata is user-editable, so trusting it for roles would allow a
    # citizen to self-escalate to cm_cell. app_metadata first; user_metadata is
    # only consulted as a legacy fallback for display-ish fields.
    app_meta: dict = payload.get("app_metadata") or {}
    user_meta: dict = payload.get("user_metadata") or {}

    role: str = app_meta.get("dcos_role") or payload.get("role") or "citizen"
    # Supabase's own "role" field is "authenticated" — never an app role
    if role == "authenticated":
        role = app_meta.get("dcos_role", "citizen")

    dept_id: str | None = app_meta.get("department_id") or payload.get("department_id") or None

    # Display name is non-sensitive, so user_metadata is acceptable here.
    name: str | None = app_meta.get("name") or user_meta.get("name") or payload.get("name") or None

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
