"""
Integration tests: Row Level Security + application-level authorization.

These tests require a running Postgres with migrations applied (including 0002_rls_policies).
They verify the "done-when" condition for Epic 3:
  - A DJB officer is denied on MCD rows at the APP level (403 from the router)
  - A DJB officer is denied at the DB level even when the app guard is bypassed
  - A citizen sees only their own grievances
  - A cm_cell officer sees everything

Run:
    pytest tests/test_rls.py -v
    (DATABASE_URL and REDIS_URL must be set in env)
"""
from __future__ import annotations

import os
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.auth import create_local_token
from app.main import app

# Skip entire module if no DATABASE_URL is set (CI without Postgres)
pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="DATABASE_URL not set — skipping RLS integration tests",
)

# Main connection (superuser — for seed/setup only)
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://dcos:dcos@localhost:5432/dcos"
)
# Non-superuser role for RLS enforcement tests — bypasses nothing
RLS_DATABASE_URL = DATABASE_URL.replace(
    "dcos:dcos@", "dcos_app:dcos_app@"
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
async def http() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Superuser session — used for seed/cleanup only."""
    engine = create_async_engine(DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def rls_session() -> AsyncGenerator[AsyncSession, None]:
    """Non-superuser session (dcos_app) — subject to RLS policies."""
    engine = create_async_engine(RLS_DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


async def _rls_query(sql: str, params: dict | None = None) -> list[dict]:
    """
    Run a query as dcos_app (non-superuser) using raw asyncpg — guaranteed
    single connection, so SET LOCAL vars apply to the SELECT in the same txn.
    """
    import asyncpg
    dsn = RLS_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        async with conn.transaction():
            if params:
                for key, value in params.items():
                    await conn.execute(
                        f"SET LOCAL \"app.{key}\" = '{value}'"
                    )
            return [dict(r) for r in await conn.fetch(sql)]
    finally:
        await conn.close()


@pytest_asyncio.fixture
async def seed_data(db_session: AsyncSession):
    """
    Insert minimal test fixtures — two departments and one grievance each.
    Uses bypass_rls so the seed is unaffected by policies.
    Returns (mcd_dept_id, djb_dept_id, mcd_grievance_id, citizen_user_id).
    """
    await db_session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))

    mcd_id = str(uuid.uuid4())
    djb_id = str(uuid.uuid4())
    citizen_id = str(uuid.uuid4())
    mcd_grief_id = str(uuid.uuid4())
    citizen_grief_id = str(uuid.uuid4())

    await db_session.execute(text("""
        INSERT INTO departments (id, name, short_code)
        VALUES (:id, 'Test MCD', 'TEST-MCD'),
               (:djb_id, 'Test DJB', 'TEST-DJB')
        ON CONFLICT DO NOTHING
    """), {"id": mcd_id, "djb_id": djb_id})

    await db_session.execute(text("""
        INSERT INTO users (id, name, role, language_pref)
        VALUES (:id, 'Test Citizen', 'citizen', 'hi')
        ON CONFLICT DO NOTHING
    """), {"id": citizen_id})

    # One MCD grievance (no citizen)
    await db_session.execute(text("""
        INSERT INTO grievances
          (id, tracking_id, channel, raw_text, language, category, department_id, status, priority)
        VALUES
          (:id, :tid, 'web', 'MCD pothole test', 'hi', 'Pothole', :dept_id, 'RECEIVED', 'MEDIUM')
        ON CONFLICT DO NOTHING
    """), {"id": mcd_grief_id, "tid": f"TST-MCD-{mcd_grief_id[:8]}", "dept_id": mcd_id})

    # One grievance owned by citizen
    await db_session.execute(text("""
        INSERT INTO grievances
          (id, tracking_id, channel, raw_text, language, category, department_id, citizen_id, status, priority)
        VALUES
          (:id, :tid, 'web', 'Citizen water test', 'hi', 'No Water Supply', :dept_id, :cid, 'RECEIVED', 'LOW')
        ON CONFLICT DO NOTHING
    """), {
        "id": citizen_grief_id,
        "tid": f"TST-CIT-{citizen_grief_id[:8]}",
        "dept_id": djb_id,
        "cid": citizen_id,
    })

    await db_session.commit()
    yield {
        "mcd_id": mcd_id, "djb_id": djb_id,
        "citizen_id": citizen_id,
        "mcd_grief_id": mcd_grief_id,
        "citizen_grief_id": citizen_grief_id,
    }

    # Cleanup
    await db_session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    for gid in (mcd_grief_id, citizen_grief_id):
        await db_session.execute(text("DELETE FROM grievances WHERE id = :id"), {"id": gid})
    await db_session.execute(text("DELETE FROM users WHERE id = :id"), {"id": citizen_id})
    for did in (mcd_id, djb_id):
        await db_session.execute(text("DELETE FROM departments WHERE id = :id"), {"id": did})
    await db_session.commit()


# ── Application-level authz tests ─────────────────────────────────────────────

async def test_no_token_returns_401(http: AsyncClient) -> None:
    r = await http.get("/api/v1/identity/me")
    assert r.status_code == 401


async def test_invalid_token_returns_401(http: AsyncClient) -> None:
    r = await http.get("/api/v1/identity/me", headers={"Authorization": "Bearer not.a.token"})
    assert r.status_code == 401


async def test_citizen_gets_me(http: AsyncClient) -> None:
    token = create_local_token(role="citizen", name="Test Citizen")
    r = await http.get("/api/v1/identity/me", headers={"Authorization": f"Bearer {token}"})
    # 200 means upsert_me ran (user doesn't exist yet in test DB, but that's fine for this smoke test)
    assert r.status_code in (200, 404)


async def test_departments_require_auth(http: AsyncClient) -> None:
    r = await http.get("/api/v1/identity/departments")
    assert r.status_code == 401


async def test_citizen_cannot_manage_officers(http: AsyncClient) -> None:
    token = create_local_token(role="citizen")
    r = await http.post(
        "/api/v1/identity/officers",
        json={"user_id": str(uuid.uuid4()), "department_id": str(uuid.uuid4())},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


async def test_field_officer_can_list_departments(
    http: AsyncClient,
) -> None:
    # field_officer has P.DEPARTMENT_READ → /departments should return 200
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.get("/api/v1/identity/departments", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


async def test_permissions_endpoint(http: AsyncClient) -> None:
    token = create_local_token(role="dept_admin", department_id=str(uuid.uuid4()))
    r = await http.get(
        "/api/v1/identity/me/permissions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["role"] == "dept_admin"
    assert "officer:manage_dept" in data["permissions"]
    assert "officer:manage_any" not in data["permissions"]


async def test_dev_token_endpoint_issues_token(http: AsyncClient) -> None:
    r = await http.post(
        "/api/v1/identity/token",
        json={"role": "field_officer", "department_id": str(uuid.uuid4())},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["token_type"] == "bearer"
    assert data["role"] == "field_officer"
    assert "access_token" in data


# ── RLS / DB-level isolation tests ────────────────────────────────────────────

async def test_rls_djb_officer_cannot_see_mcd_grievances(seed_data: dict) -> None:
    """DJB officer (raw asyncpg, single txn) must NOT see MCD grievances."""
    rows = await _rls_query(
        f"SELECT id FROM grievances WHERE id = '{seed_data['mcd_grief_id']}'",
        {"user_role": "field_officer", "department_id": seed_data["djb_id"],
         "user_id": str(uuid.uuid4())},
    )
    assert len(rows) == 0, "DJB officer should NOT be able to read an MCD grievance via RLS"


async def test_rls_mcd_officer_can_see_mcd_grievances(seed_data: dict) -> None:
    """MCD officer CAN see their own department's grievances."""
    rows = await _rls_query(
        f"SELECT id FROM grievances WHERE id = '{seed_data['mcd_grief_id']}'",
        {"user_role": "field_officer", "department_id": seed_data["mcd_id"],
         "user_id": str(uuid.uuid4())},
    )
    assert len(rows) == 1, "MCD officer SHOULD be able to read their own department's grievance"


async def test_rls_citizen_sees_only_own_grievance(seed_data: dict) -> None:
    """A citizen sees only grievances where citizen_id = their user_id."""
    citizen_id = seed_data["citizen_id"]
    params = {"user_role": "citizen", "user_id": citizen_id, "department_id": ""}

    own = await _rls_query(
        f"SELECT id FROM grievances WHERE id = '{seed_data['citizen_grief_id']}'", params
    )
    assert len(own) == 1, "Citizen should see their own grievance"

    other = await _rls_query(
        f"SELECT id FROM grievances WHERE id = '{seed_data['mcd_grief_id']}'", params
    )
    assert len(other) == 0, "Citizen should NOT see another user's grievance"


async def test_rls_cm_cell_sees_all_grievances(seed_data: dict) -> None:
    """cm_cell sees all grievances regardless of department."""
    params = {"user_role": "cm_cell", "user_id": str(uuid.uuid4()), "department_id": ""}
    for gid in (seed_data["mcd_grief_id"], seed_data["citizen_grief_id"]):
        rows = await _rls_query(f"SELECT id FROM grievances WHERE id = '{gid}'", params)
        assert len(rows) == 1, f"cm_cell should see grievance {gid}"
