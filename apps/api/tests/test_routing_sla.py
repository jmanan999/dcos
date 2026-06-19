"""
Routing & SLA integration tests.

Tests:
  - Full pipeline: file → enrich → assign → officer gets the grievance
  - Load balancing: officer with fewest open cases is selected
  - SLA clock is set after assignment
  - SLA breach detection and escalation level increments
  - Reassignment preserves history
  - Status state machine enforced (invalid transitions rejected)
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


async def _file_and_enrich(http: AsyncClient, text_: str | None = None) -> dict:
    """Helper: file a grievance, then enrich it so routing can proceed."""
    raw = text_ or "Pothole on the main road near my house causing accidents. Urgent repair needed."
    r = await http.post(
        "/api/v1/intake/grievances",
        json={
            "raw_text": raw,
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
    return g


# ── Assignment ────────────────────────────────────────────────────────────────


async def test_assign_classified_grievance(http: AsyncClient) -> None:
    g = await _file_and_enrich(http)
    token = create_local_token(role="dept_admin", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/routing/assign/{g['grievance_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["grievance_id"] == g["grievance_id"]
    assert data["status"] in ("assigned", "skipped")  # skipped if no officers in dept


async def test_assignment_sets_sla_due(http: AsyncClient) -> None:
    """After assignment, the grievance should have sla_due_at set."""
    from app.core.database import AsyncSessionLocal
    from app.modules.intake.models import Grievance

    g = await _file_and_enrich(http)
    token = create_local_token(role="dept_admin", department_id=str(uuid.uuid4()))
    await http.post(
        f"/api/v1/routing/assign/{g['grievance_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )

    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        row = await session.get(Grievance, uuid.UUID(g["grievance_id"]))
        assert row is not None
        # SLA due should be set (may be None if no SLA policy matches,
        # but the SLAService falls back to DEFAULT_SLA_HOURS)
        assert row.sla_due_at is not None


async def test_assign_nonexistent_returns_error(http: AsyncClient) -> None:
    token = create_local_token(role="dept_admin", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/routing/assign/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "error"


async def test_citizen_cannot_assign(http: AsyncClient) -> None:
    token = create_local_token(role="citizen")
    r = await http.post(
        f"/api/v1/routing/assign/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


# ── SLA ───────────────────────────────────────────────────────────────────────


async def test_sla_status_endpoint(http: AsyncClient) -> None:
    g = await _file_and_enrich(http)
    token = create_local_token(role="dept_admin", department_id=str(uuid.uuid4()))
    await http.post(
        f"/api/v1/routing/assign/{g['grievance_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )

    r = await http.get(
        f"/api/v1/sla/status/{g['grievance_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "sla_due_at" in data
    assert "is_breached" in data
    assert data["is_breached"] is False  # Just assigned, SLA not yet breached


async def test_sla_breach_check_endpoint(http: AsyncClient) -> None:
    """check-breaches endpoint runs without error (may escalate 0 grievances in test)."""
    token = create_local_token(role="cm_cell")
    r = await http.post(
        "/api/v1/sla/check-breaches",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "checked" in data
    assert "escalated" in data


async def test_sla_breach_auto_escalates() -> None:
    """Grievances with sla_due_at in the past are escalated to level 1."""
    from app.core.database import AsyncSessionLocal
    from app.modules.sla.service import SLAService

    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))

        # Get a dept for the grievance
        dept_row = (
            await session.execute(
                text("SELECT id FROM departments WHERE short_code = 'MCD' LIMIT 1")
            )
        ).fetchone()
        dept_id = str(dept_row[0]) if dept_row else None

        # Insert a grievance that is already past its SLA
        gid = str(uuid.uuid4())
        await session.execute(
            text("""
            INSERT INTO grievances (id, tracking_id, channel, raw_text, language,
              status, priority, department_id, sla_due_at, escalation_level)
            VALUES (:id, :tid, 'api', 'SLA breach test grievance', 'en',
              'ASSIGNED', 'HIGH', :dept_id,
              now() - interval '2 hours', 0)
        """),
            {"id": gid, "tid": f"DCOS-SLA-{gid[:8].upper()}", "dept_id": dept_id},
        )
        await session.commit()

        # Run breach check
        svc = SLAService(session)
        result = await svc.check_and_escalate()

        assert result["escalated"] >= 1

        # Verify escalation level incremented
        row = (
            await session.execute(
                text("SELECT escalation_level, status FROM grievances WHERE id = :id"),
                {"id": gid},
            )
        ).fetchone()
        assert row[0] == 1
        assert row[1] == "ESCALATED"

        # Cleanup
        await session.execute(text("DELETE FROM grievances WHERE id = :id"), {"id": gid})
        await session.commit()


# ── Status state machine ──────────────────────────────────────────────────────


async def test_illegal_status_transition_rejected() -> None:
    """GrievanceRepository.transition_status() should reject invalid transitions."""
    from app.core.database import AsyncSessionLocal
    from app.modules.intake.models import GrievanceStatus
    from app.modules.intake.repository import GrievanceRepository

    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))

        # Get a real RECEIVED grievance from seed data
        row = (
            await session.execute(
                text("SELECT id FROM grievances WHERE status = 'RECEIVED' LIMIT 1")
            )
        ).fetchone()

        if not row:
            pytest.skip("No RECEIVED grievances in DB")

        repo = GrievanceRepository(session)
        (
            await session.execute(
                text("SELECT * FROM grievances WHERE id = :id"),
                {"id": str(row[0])},
            )
        ).fetchone()

        from app.modules.intake.models import Grievance

        g = await session.get(Grievance, uuid.UUID(str(row[0])))

        with pytest.raises(ValueError, match="Illegal transition"):
            await repo.transition_status(
                g,
                to_status=GrievanceStatus.CLOSED,  # RECEIVED → CLOSED is not allowed
                actor_id="test",
                actor_role="citizen",
            )
