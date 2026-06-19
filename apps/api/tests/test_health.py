import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def test_healthz(client: AsyncClient) -> None:
    response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_module_health_endpoints(client: AsyncClient) -> None:
    modules = [
        "identity",
        "intake",
        "ai",
        "routing",
        "sla",
        "workforce",
        "citizen",
        "analytics",
        "reporting",
        "integration",
        "platform",
    ]
    for mod in modules:
        r = await client.get(f"/api/v1/{mod}/health")
        assert r.status_code == 200, f"{mod} health failed: {r.text}"
        assert r.json()["status"] == "ok"
