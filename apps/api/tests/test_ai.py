"""
AI service tests — mock-mode (no Gemini API key needed).

Tests:
  - Mock enrichment classifies grievances using keyword matching
  - Grievance status transitions to CLASSIFIED after enrichment
  - Department is assigned from category
  - Severity and spam scores are set
  - Feedback label recording
  - Cluster detection with seeded embeddings (vector similarity)
"""

from __future__ import annotations

import json
import os
import random
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


async def _file_grievance(http: AsyncClient, text_: str) -> dict:
    r = await http.post(
        "/api/v1/intake/grievances",
        json={
            "raw_text": text_,
            "channel": "web",
            "language": "en",
            "idempotency_key": str(uuid.uuid4()),
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


# ── Mock enrichment ────────────────────────────────────────────────────────────


async def test_mock_enrich_classifies_grievance(http: AsyncClient) -> None:
    """AI mock mode classifies 'pothole' complaints to MCD."""
    g = await _file_grievance(
        http, "There is a huge pothole on the road near my house causing accidents daily."
    )

    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/ai/enrich/{g['grievance_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["classification"]["category"] == "Pothole / Road Damage"
    assert data["classification"]["department_code"] == "MCD"
    assert data["classification"]["confidence"] == 0.75


async def test_mock_enrich_water_complaint_goes_to_djb(http: AsyncClient) -> None:
    g = await _file_grievance(http, "No water supply for 3 days. DJB please fix the pipe leakage.")
    token = create_local_token(role="dept_admin", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/ai/enrich/{g['grievance_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["classification"]["department_code"] == "DJB"


async def test_enrich_updates_grievance_status(http: AsyncClient) -> None:
    """After enrichment, status should be CLASSIFIED (not RECEIVED)."""
    from app.core.database import AsyncSessionLocal
    from app.modules.intake.models import Grievance

    g = await _file_grievance(
        http, "Garbage not collected for 3 days. Stray dogs menace near colony."
    )
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    await http.post(
        f"/api/v1/ai/enrich/{g['grievance_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )

    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        row = await session.get(Grievance, uuid.UUID(g["grievance_id"]))
        assert row is not None
        assert row.status == "CLASSIFIED"
        assert row.category is not None
        assert row.department_id is not None


async def test_enrich_sets_severity_and_spam(http: AsyncClient) -> None:
    g = await _file_grievance(http, "Road near school has big pothole. Children could get hurt.")
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/ai/enrich/{g['grievance_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    data = r.json()
    assert 1 <= data["severity"]["score"] <= 100
    assert 0.0 <= data["spam"]["score"] <= 1.0
    assert data["spam"]["is_spam"] is False


async def test_enrich_nonexistent_grievance_returns_404(http: AsyncClient) -> None:
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    r = await http.post(
        f"/api/v1/ai/enrich/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 404


# ── Feedback label ────────────────────────────────────────────────────────────


async def test_officer_records_category_correction(http: AsyncClient) -> None:
    g = await _file_grievance(http, "Broken streetlight on main road causing accidents at night.")
    # First enrich to set original category
    token = create_local_token(role="field_officer", department_id=str(uuid.uuid4()))
    await http.post(
        f"/api/v1/ai/enrich/{g['grievance_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    # Officer submits correction
    r = await http.post(
        "/api/v1/ai/feedback",
        json={
            "grievance_id": g["grievance_id"],
            "corrected_category": "Streetlight Not Working",
            "corrected_department_code": "PWD",
            "correction_note": "Misclassified as pothole; actually streetlight issue",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "recorded"


# ── Cluster detection (with seeded embeddings) ────────────────────────────────


async def test_cluster_detection_with_similar_embeddings() -> None:
    """
    Two grievances with near-identical embeddings in the same category
    should be detected as duplicates and grouped into a cluster.
    """
    from app.core.database import AsyncSessionLocal
    from app.modules.ai.service import AIService
    from app.modules.intake.models import Grievance

    # Base embedding (768-dim)
    base_emb = [round(random.gauss(0, 0.1), 6) for _ in range(768)]
    # Slightly perturbed copy (cosine similarity ~0.99)
    perturbed = [v + random.gauss(0, 0.001) for v in base_emb]

    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))

        # Get any MCD dept
        dept_row = (
            await session.execute(
                text("SELECT id FROM departments WHERE short_code = 'MCD' LIMIT 1")
            )
        ).fetchone()
        dept_id = str(dept_row[0]) if dept_row else None

        # Insert first grievance with the base embedding (already classified)
        g1_id = str(uuid.uuid4())
        # Use CAST(x AS vector) — ::vector confuses SQLAlchemy's :param parser
        await session.execute(
            text("""
            INSERT INTO grievances (id, tracking_id, channel, raw_text, language,
              category, department_id, status, priority)
            VALUES (:id, :tid, 'api', 'Pothole near market', 'en',
              'Pothole / Road Damage', :dept_id, 'CLASSIFIED', 'MEDIUM')
        """),
            {"id": g1_id, "tid": f"DCOS-TST-{g1_id[:8].upper()}", "dept_id": dept_id},
        )
        await session.execute(
            text("UPDATE grievances SET embedding = CAST(:emb AS vector) WHERE id = :id"),
            {"emb": json.dumps(base_emb), "id": g1_id},
        )

        # Insert second grievance (RECEIVED — to be enriched)
        g2_id = str(uuid.uuid4())
        await session.execute(
            text("""
            INSERT INTO grievances (id, tracking_id, channel, raw_text, language, status, priority)
            VALUES (:id, :tid, 'api', 'Same pothole still not fixed near market', 'en', 'RECEIVED', 'MEDIUM')
        """),
            {"id": g2_id, "tid": f"DCOS-TST-{g2_id[:8].upper()}"},
        )
        await session.commit()

        # Now run cluster detection directly
        g2 = await session.get(Grievance, uuid.UUID(g2_id))
        from app.modules.ai.schemas import ClassificationResult

        clf = ClassificationResult(
            category="Pothole / Road Damage",
            department_code="MCD",
            confidence=0.9,
        )
        svc = AIService(session)
        cluster = await svc._detect_cluster(g2, clf, perturbed)

        # Should detect the existing grievance as similar
        assert len(cluster.similar_grievance_ids) >= 1
        assert cluster.cluster_id is not None

        await session.commit()

        # Cleanup
        await session.execute(
            text("DELETE FROM grievances WHERE id IN (:g1, :g2)"), {"g1": g1_id, "g2": g2_id}
        )
        await session.commit()
