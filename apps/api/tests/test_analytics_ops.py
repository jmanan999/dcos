"""
Analytics operations endpoints (the grievance-control-room metrics).

Tests:
  - pendency / escalation-pyramid / root-cause / audit-sample require auth
  - each returns its documented shape with live (seeded) data
  - leaderboard now carries sla_target_hours (claim-vs-truth)
"""

from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient

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


def _cm_token() -> str:
    return create_local_token(role="cm_cell")


# ── Auth gates ────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "path",
    ["/pendency", "/escalation-pyramid", "/root-cause", "/audit-sample"],
)
async def test_ops_endpoints_require_auth(http: AsyncClient, path: str) -> None:
    r = await http.get(f"/api/v1/analytics{path}")
    assert r.status_code == 401


# ── Pendency ──────────────────────────────────────────────────────────────────


async def test_pendency_returns_four_buckets(http: AsyncClient) -> None:
    r = await http.get(
        "/api/v1/analytics/pendency", headers={"Authorization": f"Bearer {_cm_token()}"}
    )
    assert r.status_code == 200
    data = r.json()
    assert "total_open" in data
    assert len(data["buckets"]) == 4
    labels = [b["label"] for b in data["buckets"]]
    assert labels == ["0-7 days", "8-15 days", "16-30 days", "30+ days"]
    # totals are internally consistent
    assert sum(b["count"] for b in data["buckets"]) == data["total_open"]


# ── Escalation pyramid ────────────────────────────────────────────────────────


async def test_escalation_pyramid_has_four_levels(http: AsyncClient) -> None:
    r = await http.get(
        "/api/v1/analytics/escalation-pyramid",
        headers={"Authorization": f"Bearer {_cm_token()}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert [lvl["level"] for lvl in data["levels"]] == [0, 1, 2, 3]
    assert data["levels"][0]["label"] == "Field Officer"
    assert data["levels"][3]["label"] == "CM Cell"


# ── Root cause ────────────────────────────────────────────────────────────────


async def test_root_cause_shape(http: AsyncClient) -> None:
    r = await http.get(
        "/api/v1/analytics/root-cause", headers={"Authorization": f"Bearer {_cm_token()}"}
    )
    assert r.status_code == 200
    data = r.json()
    assert "repeat_clusters" in data
    assert "category_breaches" in data
    assert "staffing_gaps" in data
    assert isinstance(data["category_breaches"], list)


# ── Audit sample ──────────────────────────────────────────────────────────────


async def test_audit_sample_shape(http: AsyncClient) -> None:
    r = await http.get(
        "/api/v1/analytics/audit-sample?limit=10",
        headers={"Authorization": f"Bearer {_cm_token()}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["sample_size"] == len(data["rows"])
    assert data["sample_size"] <= 10
    for row in data["rows"]:
        # flagged exactly when proof is incomplete
        assert row["flagged"] == (not row["proof_complete"])


# ── Claim vs Truth ────────────────────────────────────────────────────────────


async def test_leaderboard_carries_sla_target(http: AsyncClient) -> None:
    r = await http.get(
        "/api/v1/analytics/leaderboard", headers={"Authorization": f"Bearer {_cm_token()}"}
    )
    assert r.status_code == 200
    rows = r.json()
    if rows:
        assert "sla_target_hours" in rows[0]
