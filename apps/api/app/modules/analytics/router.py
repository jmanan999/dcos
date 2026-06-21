from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_permission
from app.core.permissions import P
from app.modules.analytics.schemas import (
    AuditSample,
    CitizenJourney,
    DailyTrendPoint,
    DelhiRiskIndex,
    DeptLeaderboardRow,
    EscalationPyramid,
    ExecutiveBrief,
    KPISnapshot,
    NLQueryRequest,
    NLQueryResponse,
    PendencySnapshot,
    RootCauseReport,
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


@router.get("/pendency", response_model=PendencySnapshot)
async def pendency(
    dept_id: str | None = Query(default=None),
    _: _AnalyticsAuth = None,
    svc: AnalyticsService = Depends(_get_svc),
) -> PendencySnapshot:
    """Open grievances bucketed by age (0–7 / 8–15 / 16–30 / 30+ days)."""
    return await svc.get_pendency(dept_id)


@router.get("/escalation-pyramid", response_model=EscalationPyramid)
async def escalation_pyramid(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> EscalationPyramid:
    """Live counts of active grievances at each escalation level (L0–L3)."""
    return await svc.get_escalation_pyramid()


@router.get("/root-cause", response_model=RootCauseReport)
async def root_cause(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> RootCauseReport:
    """Repeat clusters, category breach rates, and department staffing gaps."""
    return await svc.get_root_cause()


@router.get("/audit-sample", response_model=AuditSample)
async def audit_sample(
    limit: int = Query(default=20, le=100),
    _: _AnalyticsAuth = None,
    svc: AnalyticsService = Depends(_get_svc),
) -> AuditSample:
    """Random sample of resolved/verified cases, re-checked for proof completeness."""
    return await svc.get_audit_sample(limit=limit)


@router.post("/refresh-views", status_code=200)
async def refresh_views(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> dict[str, str]:
    """Manually trigger materialized view refresh (normally done by cron worker)."""
    return await svc.refresh_views()
