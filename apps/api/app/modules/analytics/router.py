from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_permission
from app.core.permissions import P
from app.modules.analytics.schemas import (
    CitizenJourney,
    DailyTrendPoint,
    DelhiRiskIndex,
    DeptLeaderboardRow,
    ExecutiveBrief,
    KPISnapshot,
    NLQueryRequest,
    NLQueryResponse,
    WardHotspot,
)
from app.modules.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

_AnalyticsAuth = Annotated[object, Depends(require_permission(P.GRIEVANCE_READ_ANY))]


async def _get_svc(db: AsyncSession = Depends(get_db)) -> AnalyticsService:
    await db.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    return AnalyticsService(db)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "analytics", "status": "ok"}


@router.get("/kpis", response_model=KPISnapshot)
async def get_kpis(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> KPISnapshot:
    """Real-time KPI snapshot — filed, open, resolved, SLA breaches."""
    return await svc.get_kpis()


@router.get("/hotspots", response_model=list[WardHotspot])
async def get_hotspots(
    limit: int = Query(default=100, le=500),
    _: _AnalyticsAuth = None,
    svc: AnalyticsService = Depends(_get_svc),
) -> list[WardHotspot]:
    """Ward-level hotspot data for the GIS heatmap."""
    return await svc.get_hotspots(limit=limit)


@router.get("/leaderboard", response_model=list[DeptLeaderboardRow])
async def get_leaderboard(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> list[DeptLeaderboardRow]:
    """Department leaderboard ranked by resolution rate."""
    return await svc.get_dept_leaderboard()


@router.get("/trend", response_model=list[DailyTrendPoint])
async def get_trend(
    days: int = Query(default=30, le=365),
    _: _AnalyticsAuth = None,
    svc: AnalyticsService = Depends(_get_svc),
) -> list[DailyTrendPoint]:
    """Daily trend data for the last N days."""
    return await svc.get_trend(days=days)


@router.post("/nl-query", response_model=NLQueryResponse)
async def nl_query(
    body: NLQueryRequest,
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> NLQueryResponse:
    """Natural-language query over the analytics read model (NL→SQL via Gemini)."""
    return await svc.nl_query(body)


@router.get("/executive-brief", response_model=ExecutiveBrief)
async def executive_brief(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> ExecutiveBrief:
    """Auto-generated morning executive brief with key stats and hotspots."""
    return await svc.get_executive_brief()


@router.get("/risk-index", response_model=DelhiRiskIndex)
async def risk_index(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> DelhiRiskIndex:
    """Delhi Risk Index — composite city health score (CRITICAL/HIGH/MEDIUM/LOW)."""
    return await svc.get_risk_index()


@router.get("/citizen-journey", response_model=CitizenJourney | None)
async def citizen_journey(
    tracking_id: str | None = Query(default=None),
    _: _AnalyticsAuth = None,
    svc: AnalyticsService = Depends(_get_svc),
) -> CitizenJourney | None:
    """Live citizen complaint journey for demo display."""
    return await svc.get_citizen_journey(tracking_id)


@router.post("/refresh-views", status_code=200)
async def refresh_views(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> dict[str, str]:
    """Manually trigger materialized view refresh (normally done by cron worker)."""
    return await svc.refresh_views()
