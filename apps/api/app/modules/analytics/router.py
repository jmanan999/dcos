from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_permission
from app.core.permissions import P
from app.modules.analytics.schemas import (
    AuditSample,
    BurnoutReport,
    CitizenJourney,
    ContractorIntelligenceReport,
    DailyTrendPoint,
    DelhiRiskIndex,
    DeptLeaderboardRow,
    EarlyWarningReport,
    EconomicDragReport,
    EnhancedPredictiveReport,
    EscalationPyramid,
    ExecutiveBrief,
    GovernanceScorecard,
    KPISnapshot,
    NLQueryRequest,
    NLQueryResponse,
    PendencySnapshot,
    PredictiveReport,
    PreemptiveAlertReport,
    RootCauseReport,
    SimulationRequest,
    SimulationResult,
    WardHotspot,
    WardIndexReport,
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


@router.get("/economic-drag", response_model=EconomicDragReport)
async def economic_drag(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> EconomicDragReport:
    """Daily economic cost of unresolved complaints in rupees — the headline number."""
    return await svc.get_economic_drag()


@router.get("/ward-index", response_model=WardIndexReport)
async def ward_index(
    _: _AnalyticsAuth = None,
    svc: AnalyticsService = Depends(_get_svc),
) -> WardIndexReport:
    """Ward Productivity Index — all Delhi wards ranked 0-100 by governance quality."""
    return await svc.get_ward_index()


@router.get("/predictions", response_model=PredictiveReport)
async def predictions(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> PredictiveReport:
    """Forward-looking alerts — predicts complaint spikes before they happen."""
    return await svc.get_predictions()


@router.get("/contractor-intelligence", response_model=ContractorIntelligenceReport)
async def contractor_intelligence(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> ContractorIntelligenceReport:
    """Department risk scores as proxy for contractor performance accountability."""
    return await svc.get_contractor_intelligence()


@router.get("/governance-scorecard", response_model=GovernanceScorecard)
async def governance_scorecard(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> GovernanceScorecard:
    """CM morning brief — city health, economic drag, worst wards, action items."""
    return await svc.get_governance_scorecard()


@router.post("/refresh-views", status_code=200)
async def refresh_views(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> dict[str, str]:
    """Manually trigger materialized view refresh (normally done by cron worker)."""
    return await svc.refresh_views()


# ── Epic 4: Predictive Governance ────────────────────────────────────────────


@router.get("/predictions/enhanced", response_model=EnhancedPredictiveReport)
async def enhanced_predictions(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> EnhancedPredictiveReport:
    """Enhanced ML predictions — exponential smoothing + Delhi seasonal factors + confidence intervals."""
    return await svc.get_enhanced_predictions()


@router.get("/burnout-scores", response_model=BurnoutReport)
async def burnout_scores(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> BurnoutReport:
    """Officer burnout risk computed from caseload + breach rate + CSAT decline."""
    return await svc.compute_burnout_scores()


@router.get("/early-warning", response_model=EarlyWarningReport)
async def early_warning(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> EarlyWarningReport:
    """Wards declining in WPI for 3+ consecutive weeks — watch / warning / crisis."""
    return await svc.get_early_warning()


@router.post("/simulate", response_model=SimulationResult)
async def simulate_policy(
    payload: SimulationRequest,
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> SimulationResult:
    """Policy simulator — model budget reallocation impact on complaint volume and economic drag."""
    return await svc.simulate_policy(payload)


@router.get("/preemptive-wards", response_model=PreemptiveAlertReport)
async def preemptive_wards(
    _: _AnalyticsAuth,
    svc: AnalyticsService = Depends(_get_svc),
) -> PreemptiveAlertReport:
    """At-risk wards for pre-emptive citizen alerts (monsoon / seasonal)."""
    return await svc.get_preemptive_at_risk_wards()
