import uuid
from contextlib import asynccontextmanager
from typing import Any

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.middleware import RequestIDMiddleware
from app.core.telemetry import setup_telemetry
from app.modules.ai.router import router as ai_router
from app.modules.analytics.router import router as analytics_router
from app.modules.citizen.router import router as citizen_router
from app.modules.identity.router import router as identity_router
from app.modules.intake.router import router as intake_router
from app.modules.integration.router import router as integration_router
from app.modules.platform.router import router as platform_router
from app.modules.reporting.router import router as reporting_router
from app.modules.routing.router import router as routing_router
from app.modules.sla.router import router as sla_router
from app.modules.workforce.router import router as workforce_router

log = structlog.get_logger()

_PREFIX = f"/api/{settings.API_VERSION}"

_MODULE_ROUTERS = [
    identity_router,
    intake_router,
    ai_router,
    routing_router,
    sla_router,
    workforce_router,
    citizen_router,
    analytics_router,
    reporting_router,
    integration_router,
    platform_router,
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("dcos.startup", environment=settings.ENVIRONMENT, version=settings.API_VERSION)
    yield
    log.info("dcos.shutdown")


def create_app() -> FastAPI:
    setup_logging()
    setup_telemetry()

    app = FastAPI(
        title="DCOS API",
        description=(
            "Delhi Citizen Operating System — Grievance & Governance Command Center. "
            "See /docs for interactive API reference."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    )

    # ── Middleware (applied bottom-to-top) ────────────────────────────────────
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Response-Time"],
    )

    # ── Module routers ────────────────────────────────────────────────────────
    for router in _MODULE_ROUTERS:
        app.include_router(router, prefix=_PREFIX)

    return app


app = create_app()


# ── Health + readiness ────────────────────────────────────────────────────────

@app.get("/healthz", tags=["Health"], include_in_schema=False)
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz", tags=["Health"], include_in_schema=False)
async def readyz() -> JSONResponse:
    checks: dict[str, Any] = {}
    ok = True

    try:
        from app.core.database import engine
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as exc:
        checks["db"] = str(exc)
        ok = False

    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = str(exc)
        ok = False

    return JSONResponse(
        status_code=200 if ok else 503,
        content={"status": "ok" if ok else "degraded", "checks": checks},
    )
