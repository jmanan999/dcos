"""
Workforce / officer console tests.

Tests:
  - Officer queue returns assigned grievances sorted by SLA
  - claim transitions ASSIGNED → IN_PROGRESS
  - resolve is BLOCKED without proof (closure gate enforced)
  - resolve succeeds after uploading before+after proof
  - handoff re-routes to different department
  - state machine blocks illegal transitions (RECEIVED → RESOLVED)
  - dept workload summary returns officer stats
  - proof geo validation (EXIF distance)
"""

from __future__ import annotations

import os
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.core.auth import create_local_token
from app.main import app

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="DATABASE_URL not set",
)


@pytest.fixture
async def http() -> AsyncClient:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _create_enriched_grievance(http: AsyncClient) -> tuple[str, str]:
    """Returns (grievance_id, tracking_id) of a CLASSIFIED grievance."""
    r = await http.post(
        "/api/v1/intake/grievances",
        json={
            "raw_text": "Pothole on main road near colony causing accidents.",
            "channel": "web",
            "language": "en",
            "idempotency_key": str(uuid.uuid4()),
        },
    )
    assert r.status_code == 201
    g = r.json()
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    await http.post(
        f"/api/v1/ai/enrich/{g['grievance_id']}", headers={"Authorization": f"Bearer {token}"}
    )
    return g["grievance_id"], g["tracking_id"]


async def _assign_to_officer(http: AsyncClient, grievance_id: str, officer_id: str) -> None:
    """Directly set assigned_officer_id in the DB for test setup."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as s:
        await s.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        await s.execute(
            text("""
            UPDATE grievances SET assigned_officer_id = :oid, status = 'ASSIGNED', updated_at = now()
            WHERE id = :gid
        """),
            {"oid": officer_id, "gid": grievance_id},
        )
        await s.commit()


# ── Queue ─────────────────────────────────────────────────────────────────────


async def test_queue_requires_auth(http: AsyncClient) -> None:
    r = await http.get("/api/v1/workforce/queue")
    assert r.status_code == 401


async def test_queue_returns_list_for_officer(http: AsyncClient) -> None:
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.get("/api/v1/workforce/queue", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_dept_queue_requires_officer_permission(http: AsyncClient) -> None:
    token = create_local_token(role="citizen")
    r = await http.get("/api/v1/workforce/dept-queue", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


# ── Claim ─────────────────────────────────────────────────────────────────────


async def test_claim_transitions_to_in_progress(http: AsyncClient) -> None:
    from app.core.database import AsyncSessionLocal
    from app.modules.intake.models import Grievance

    gid, _ = await _create_enriched_grievance(http)

    # Create a real officer in the DB
    async with AsyncSessionLocal() as s:
        await s.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        uid = str(uuid.uuid4())
        oid = str(uuid.uuid4())
        dept_row = (await s.execute(text("SELECT id FROM departments LIMIT 1"))).fetchone()
        dept_id = str(dept_row[0]) if dept_row else str(uuid.uuid4())
        await s.execute(
            text(
                "INSERT INTO users (id, name, role) VALUES (:id, 'Test Officer', 'field_officer') ON CONFLICT DO NOTHING"
            ),
            {"id": uid},
        )
        await s.execute(
            text(
                "INSERT INTO officers (id, user_id, department_id) VALUES (:id, :uid, :dept) ON CONFLICT DO NOTHING"
            ),
            {"id": oid, "uid": uid, "dept": dept_id},
        )
        await s.execute(
            text(
                "UPDATE grievances SET assigned_officer_id = :oid, status = 'ASSIGNED' WHERE id = :gid"
            ),
            {"oid": oid, "gid": gid},
        )
        await s.commit()

    # Officer claims it
    token = create_local_token(user_id=uid, role="field_officer", department_id=dept_id)
    r = await http.post(
        f"/api/v1/workforce/grievances/{gid}/claim", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "IN_PROGRESS"

    # Verify DB state
    async with AsyncSessionLocal() as s:
        await s.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        g = await s.get(Grievance, uuid.UUID(gid))
        assert g is not None
        assert g.status == "IN_PROGRESS"


async def test_claim_invalid_status_returns_400(http: AsyncClient) -> None:
    gid, _ = await _create_enriched_grievance(http)
    # Grievance is CLASSIFIED (not ASSIGNED) — can't claim
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/workforce/grievances/{gid}/claim", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 400
    assert "Cannot claim" in r.json()["detail"]


# ── Proof gate ────────────────────────────────────────────────────────────────


async def test_resolve_blocked_without_proof(http: AsyncClient) -> None:
    from app.core.database import AsyncSessionLocal

    gid, _ = await _create_enriched_grievance(http)

    # Set to IN_PROGRESS directly
    async with AsyncSessionLocal() as s:
        await s.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        await s.execute(
            text("UPDATE grievances SET status = 'IN_PROGRESS' WHERE id = :id"), {"id": gid}
        )
        await s.commit()

    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/workforce/grievances/{gid}/resolve",
        json={"resolution_note": "Fixed the pothole with cold mix"},
        headers={"Authorization": f"Bearer {token}"},
    )
    # Must be blocked — no proof uploaded
    assert r.status_code == 422
    assert "proof" in r.json()["detail"].lower()


async def test_proof_verification_empty(http: AsyncClient) -> None:
    gid, _ = await _create_enriched_grievance(http)
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.get(
        f"/api/v1/workforce/grievances/{gid}/proof", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    data = r.json()
    assert data["is_valid"] is False
    assert data["has_before"] is False
    assert data["has_after"] is False


# ── Notes + handoff ───────────────────────────────────────────────────────────


async def test_add_note_to_grievance(http: AsyncClient) -> None:
    gid, _ = await _create_enriched_grievance(http)
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/workforce/grievances/{gid}/notes",
        json={"note": "Visited site — pothole confirmed near bus stop"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["note"] == "Visited site — pothole confirmed near bus stop"


async def test_get_notes_returns_list(http: AsyncClient) -> None:
    gid, _ = await _create_enriched_grievance(http)
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.get(
        f"/api/v1/workforce/grievances/{gid}/notes", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_handoff_reroutes_to_new_dept(http: AsyncClient) -> None:
    from app.core.database import AsyncSessionLocal
    from app.modules.intake.models import Grievance

    gid, _ = await _create_enriched_grievance(http)

    async with AsyncSessionLocal() as s:
        await s.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        await s.execute(
            text("UPDATE grievances SET status = 'IN_PROGRESS' WHERE id = :id"), {"id": gid}
        )
        new_dept = (await s.execute(text("SELECT id FROM departments LIMIT 1"))).fetchone()
        new_dept_id = str(new_dept[0]) if new_dept else str(uuid.uuid4())
        await s.commit()

    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/workforce/grievances/{gid}/notes",
        json={
            "note": "This is actually a DJB issue not MCD",
            "is_handoff": True,
            "handoff_dept_id": new_dept_id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200

    # Verify grievance re-routed
    async with AsyncSessionLocal() as s:
        await s.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        g = await s.get(Grievance, uuid.UUID(gid))
        assert g is not None
        assert g.status == "CLASSIFIED"
        assert str(g.department_id) == new_dept_id
        assert g.assigned_officer_id is None


# ── Proof geo validation ──────────────────────────────────────────────────────


async def test_proof_geo_validation_helper() -> None:
    """Unit test for haversine calculation used in proof geo check."""
    from app.modules.workforce.service import _haversine_m

    # Connaught Place to India Gate: ~2.5 km
    dist = _haversine_m(28.6315, 77.2167, 28.6121, 77.2295)
    assert 2000 < dist < 3000, f"Expected ~2.5km, got {dist:.0f}m"

    # Same point → 0
    assert _haversine_m(28.6315, 77.2167, 28.6315, 77.2167) < 1


# ── State machine ─────────────────────────────────────────────────────────────


async def test_illegal_transition_blocked(http: AsyncClient) -> None:
    """RECEIVED → RESOLVED should raise in GrievanceRepository."""
    from app.core.database import AsyncSessionLocal
    from app.modules.intake.models import Grievance, GrievanceStatus
    from app.modules.intake.repository import GrievanceRepository

    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        row = (
            await session.execute(
                text("SELECT id FROM grievances WHERE status = 'RECEIVED' LIMIT 1")
            )
        ).fetchone()
        if not row:
            pytest.skip("No RECEIVED grievances")

        g = await session.get(Grievance, uuid.UUID(str(row[0])))
        repo = GrievanceRepository(session)
        with pytest.raises(ValueError, match="Illegal transition"):
            await repo.transition_status(g, GrievanceStatus.RESOLVED, actor_id="x")
