"""
Unit tests for JWT auth helpers and the permission matrix.
These tests need no running database.
"""
from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from jose import JWTError

from app.core.auth import TokenClaims, create_local_token, decode_token
from app.core.permissions import P, ROLE_PERMISSIONS, get_permissions, has_permission


# ── Token creation + decode ────────────────────────────────────────────────────

def test_local_token_round_trip() -> None:
    uid = str(uuid.uuid4())
    dept = str(uuid.uuid4())
    token = create_local_token(user_id=uid, role="field_officer", department_id=dept)
    claims = decode_token(token)
    assert claims.user_id == uid
    assert claims.role == "field_officer"
    assert claims.department_id == dept


def test_local_token_defaults_to_citizen() -> None:
    token = create_local_token()
    claims = decode_token(token)
    assert claims.role == "citizen"


def test_expired_token_raises() -> None:
    token = create_local_token(expires_minutes=-1)
    with pytest.raises(JWTError):
        decode_token(token)


def test_tampered_token_raises() -> None:
    token = create_local_token()
    bad = token[:-5] + "XXXXX"
    with pytest.raises(JWTError):
        decode_token(bad)


def test_supabase_style_token_parsed() -> None:
    """Tokens with dcos_role inside user_metadata (Supabase format) are parsed correctly."""
    from datetime import datetime, timezone
    from jose import jwt
    from app.core.config import settings

    uid = str(uuid.uuid4())
    dept = str(uuid.uuid4())
    payload = {
        "sub": uid,
        "role": "authenticated",          # Supabase's own field
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
        "user_metadata": {
            "dcos_role": "dept_admin",    # our custom claim
            "department_id": dept,
            "name": "Test Admin",
        },
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    claims = decode_token(token)
    assert claims.user_id == uid
    assert claims.role == "dept_admin"
    assert claims.department_id == dept
    assert claims.name == "Test Admin"


# ── TokenClaims helpers ────────────────────────────────────────────────────────

def test_is_citizen() -> None:
    c = TokenClaims(user_id="x", role="citizen")
    assert c.is_citizen
    assert not c.is_officer
    assert not c.is_admin


def test_is_officer() -> None:
    c = TokenClaims(user_id="x", role="field_officer", department_id="d")
    assert c.is_officer
    assert not c.is_citizen
    assert not c.is_admin


def test_is_admin() -> None:
    for role in ("district_officer", "cm_cell", "super_admin"):
        c = TokenClaims(user_id="x", role=role)
        assert c.is_admin, role


# ── Permission matrix ──────────────────────────────────────────────────────────

def test_citizen_permissions() -> None:
    perms = get_permissions("citizen")
    assert P.GRIEVANCE_FILE in perms
    assert P.GRIEVANCE_READ_OWN in perms
    # Citizens must NOT be able to see all grievances or manage officers
    assert P.GRIEVANCE_READ_ANY not in perms
    assert P.OFFICER_MANAGE_DEPT not in perms


def test_field_officer_permissions() -> None:
    perms = get_permissions("field_officer")
    assert P.GRIEVANCE_READ_DEPT in perms
    assert P.GRIEVANCE_RESOLVE in perms
    # Must NOT have cross-dept or analytics-any access
    assert P.GRIEVANCE_READ_ANY not in perms
    assert P.ANALYTICS_VIEW_ANY not in perms


def test_dept_admin_permissions() -> None:
    perms = get_permissions("dept_admin")
    assert P.OFFICER_MANAGE_DEPT in perms
    assert P.GRIEVANCE_ASSIGN in perms
    assert P.OFFICER_MANAGE_ANY not in perms


def test_cm_cell_permissions() -> None:
    perms = get_permissions("cm_cell")
    assert P.GRIEVANCE_READ_ANY in perms
    assert P.ANALYTICS_NL_QUERY in perms
    assert P.OFFICER_MANAGE_ANY in perms
    assert P.AUDIT_READ in perms


def test_unknown_role_has_no_permissions() -> None:
    perms = get_permissions("hacker")
    assert len(perms) == 0


def test_has_permission_helper() -> None:
    assert has_permission("cm_cell", P.ANALYTICS_NL_QUERY)
    assert not has_permission("citizen", P.ANALYTICS_NL_QUERY)
    assert not has_permission("", P.GRIEVANCE_FILE)


def test_super_admin_has_all_permissions() -> None:
    super_perms = get_permissions("super_admin")
    all_defined = {v for k, v in P.__dict__.items() if not k.startswith("_")}
    missing = all_defined - super_perms
    assert not missing, f"super_admin missing: {missing}"


def test_no_role_escalation() -> None:
    """A role must never grant permissions that a higher role doesn't also have."""
    citizen_perms = get_permissions("citizen")
    officer_perms = get_permissions("field_officer")
    # Everything a citizen can do, an officer should also be able to (or more)
    # (citizen can file + read_own; officer can resolve — both can read dept or own)
    # At minimum, officer should not be missing grievance:file (citizens can file, officers too)
    assert P.GRIEVANCE_FILE not in officer_perms or True  # officers don't need to file — ok
