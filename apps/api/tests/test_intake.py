"""
Intake integration tests — requires running Postgres (DATABASE_URL env var).

Tests:
  - Web channel grievance creation (success path)
  - Emergency keyword detection + guidance returned
  - Idempotency (same key → same grievance ID)
  - Missing required field returns 422
  - WhatsApp webhook verification endpoint
  - Public tracking endpoint
"""

from __future__ import annotations

import os
import uuid

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


def _grievance_payload(**overrides) -> dict:
    return {
        "raw_text": "The road near Lajpat Nagar has a huge pothole causing accidents.",
        "channel": "web",
        "language": "en",
        "idempotency_key": str(uuid.uuid4()),
        **overrides,
    }


# ── Happy path ────────────────────────────────────────────────────────────────


async def test_create_grievance_anonymous(http: AsyncClient) -> None:
    r = await http.post("/api/v1/intake/grievances", json=_grievance_payload())
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["tracking_id"].startswith("JS-")
    assert data["status"] == "RECEIVED"
    assert data["is_emergency"] is False


async def test_create_grievance_with_location(http: AsyncClient) -> None:
    r = await http.post(
        "/api/v1/intake/grievances",
        json=_grievance_payload(
            location={"lat": 28.6315, "lng": 77.2167},  # Connaught Place
        ),
    )
    assert r.status_code == 201
    assert r.json()["tracking_id"].startswith("JS-")


async def test_create_grievance_authenticated_citizen(http: AsyncClient) -> None:
    token = create_local_token(role="citizen")
    r = await http.post(
        "/api/v1/intake/grievances",
        json=_grievance_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201


# ── Emergency detection ───────────────────────────────────────────────────────


async def test_emergency_keyword_flagged(http: AsyncClient) -> None:
    r = await http.post(
        "/api/v1/intake/grievances",
        json=_grievance_payload(
            raw_text="There is a fire in the building near my house. People are trapped.",
            idempotency_key=str(uuid.uuid4()),
        ),
    )
    assert r.status_code == 201
    data = r.json()
    assert data["is_emergency"] is True
    assert "112" in data["emergency_guidance"]


async def test_hindi_emergency_keyword(http: AsyncClient) -> None:
    r = await http.post(
        "/api/v1/intake/grievances",
        json=_grievance_payload(
            raw_text="Yahan pe aag lagi hai aur log chilla rahe hain madad karo",
            language="hi",
            idempotency_key=str(uuid.uuid4()),
        ),
    )
    assert r.status_code == 201
    assert r.json()["is_emergency"] is True


# ── Idempotency ───────────────────────────────────────────────────────────────


async def test_idempotent_duplicate_returns_same_grievance(http: AsyncClient) -> None:
    key = str(uuid.uuid4())
    r1 = await http.post("/api/v1/intake/grievances", json=_grievance_payload(idempotency_key=key))
    r2 = await http.post("/api/v1/intake/grievances", json=_grievance_payload(idempotency_key=key))
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["grievance_id"] == r2.json()["grievance_id"]
    assert r1.json()["tracking_id"] == r2.json()["tracking_id"]


# ── Validation ────────────────────────────────────────────────────────────────


async def test_short_text_rejected(http: AsyncClient) -> None:
    r = await http.post(
        "/api/v1/intake/grievances",
        json=_grievance_payload(raw_text="fix it", idempotency_key=str(uuid.uuid4())),
    )
    assert r.status_code == 422


async def test_missing_idempotency_key_rejected(http: AsyncClient) -> None:
    payload = {
        "raw_text": "The road near my house has a huge pothole that needs repair.",
        "channel": "web",
    }
    r = await http.post("/api/v1/intake/grievances", json=payload)
    assert r.status_code == 422


async def test_invalid_channel_rejected(http: AsyncClient) -> None:
    r = await http.post(
        "/api/v1/intake/grievances",
        json=_grievance_payload(channel="telegram", idempotency_key=str(uuid.uuid4())),
    )
    assert r.status_code == 422


# ── WhatsApp webhook ──────────────────────────────────────────────────────────


async def test_whatsapp_verify_endpoint(http: AsyncClient) -> None:
    r = await http.get(
        "/api/v1/intake/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "dcos-whatsapp-verify",
            "hub.challenge": "1234567890",
        },
    )
    assert r.status_code == 200
    assert r.json() == 1234567890


async def test_whatsapp_wrong_token_rejected(http: AsyncClient) -> None:
    r = await http.get(
        "/api/v1/intake/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong-token",
            "hub.challenge": "123",
        },
    )
    assert r.status_code == 403


# ── Tracking ──────────────────────────────────────────────────────────────────


async def test_track_existing_grievance(http: AsyncClient) -> None:
    key = str(uuid.uuid4())
    create_r = await http.post(
        "/api/v1/intake/grievances", json=_grievance_payload(idempotency_key=key)
    )
    assert create_r.status_code == 201
    tracking_id = create_r.json()["tracking_id"]

    r = await http.get(f"/api/v1/intake/track/{tracking_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["tracking_id"] == tracking_id
    assert data["status"] == "RECEIVED"
    assert len(data["timeline"]) >= 1


async def test_track_nonexistent_returns_404(http: AsyncClient) -> None:
    r = await http.get("/api/v1/intake/track/JS-99999999-XXXXXXXX")
    assert r.status_code == 404
