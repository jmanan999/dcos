from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class KPISnapshot(BaseModel):
    total_filed: int
    total_open: int
    total_resolved: int
    total_closed: int
    sla_breaches_active: int
    filed_today: int
    resolved_today: int
    avg_resolution_hours: float | None
    avg_csat: float | None


class WardHotspot(BaseModel):
    ward_id: str
    ward_name: str
    district_name: str | None
    lat: float | None
    lng: float | None
    open: int
    total: int
    sla_breaches: int
    severity: str  # "high" | "medium" | "low"


class DeptLeaderboardRow(BaseModel):
    department: str
    total: int
    resolved: int
    open: int
    sla_breaches: int
    resolution_rate: float | None
    avg_resolution_hours: float | None
    avg_csat: float | None
    reopen_rate: float | None
    rank: int
    # Claim vs Truth: the SLA promise (target) next to the lived reality (avg_resolution_hours)
    sla_target_hours: float | None = None


class DailyTrendPoint(BaseModel):
    day: datetime
    department: str | None
    category: str | None
    total: int
    resolved: int
    open: int


class NLQueryRequest(BaseModel):
    question: str


class NLQueryResponse(BaseModel):
    question: str
    sql: str
    results: list[dict]
    error: str | None = None


class ExecutiveBriefSection(BaseModel):
    title: str
    body: str


class ExecutiveBrief(BaseModel):
    date: str
    headline: str
    sections: list[ExecutiveBriefSection]
    top_departments_by_backlog: list[str]
    top_wards_by_open: list[str]
    generated_at: datetime


class RiskFactor(BaseModel):
    label: str
    value: str
    severity: str  # "critical" | "high" | "medium" | "low"


class DelhiRiskIndex(BaseModel):
    level: str  # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    score: int  # 0-100 (higher = worse)
    factors: list[RiskFactor]
    summary: str  # One-line human-readable status


class CitizenJourneyStep(BaseModel):
    timestamp: str
    event: str
    detail: str
    status: str  # "done" | "active" | "pending"


class CitizenJourney(BaseModel):
    tracking_id: str
    category: str | None
    department: str | None
    channel: str
    steps: list[CitizenJourneyStep]
    is_resolved: bool
    resolution_hours: float | None


# ── Operations: pendency aging ───────────────────────────────────────────────


class PendencyBucket(BaseModel):
    label: str  # "0–7 days" | "8–15 days" | "16–30 days" | "30+ days"
    min_days: int
    max_days: int | None  # None = open-ended (30+)
    count: int
    breached: int  # of those, how many are past SLA


class PendencySnapshot(BaseModel):
    total_open: int
    oldest_days: int | None
    buckets: list[PendencyBucket]


# ── Operations: escalation pyramid ───────────────────────────────────────────


class EscalationLevelRow(BaseModel):
    level: int  # 0–3
    label: str  # "Field Officer" | "Dept Admin" | "District / HOD" | "CM Cell"
    count: int
    breached: int


class EscalationPyramid(BaseModel):
    levels: list[EscalationLevelRow]
    total_escalated: int


# ── Operations: root-cause ───────────────────────────────────────────────────


class RepeatCluster(BaseModel):
    cluster_id: str
    category: str | None
    ward_name: str | None
    count: int
    open_count: int


class CategoryBreach(BaseModel):
    category: str
    total: int
    breached: int
    breach_rate: float  # %


class StaffingGap(BaseModel):
    department: str
    open_load: int
    available_officers: int
    load_per_officer: float | None


class RootCauseReport(BaseModel):
    repeat_clusters: list[RepeatCluster]
    category_breaches: list[CategoryBreach]
    staffing_gaps: list[StaffingGap]


# ── Operations: 5% quality audit ─────────────────────────────────────────────


class AuditSampleRow(BaseModel):
    grievance_id: str
    tracking_id: str
    category: str | None
    department: str | None
    status: str
    resolution_hours: float | None
    has_before_proof: bool
    has_after_proof: bool
    proof_complete: bool
    flagged: bool  # closed without complete proof → suspicious
    closed_at: str | None


class AuditSample(BaseModel):
    sample_size: int
    flagged_count: int
    rows: list[AuditSampleRow]


# ── Intelligence Layer ────────────────────────────────────────────────────────
# The layer above complaints: economic quantification, ward productivity,
# contractor accountability, and predictive governance.


class EconomicDragItem(BaseModel):
    category: str
    open_count: int
    avg_days_open: float
    daily_cost_per_complaint: float   # ₹/complaint/day (research-backed)
    total_daily_drag: float           # ₹/day for this category
    total_monthly_projection: float   # ₹/month at current rate


class EconomicDragReport(BaseModel):
    total_daily_drag_inr: float       # headline number
    total_monthly_projection_inr: float
    total_annual_projection_inr: float
    trend_vs_last_week_pct: float     # +ve = getting worse
    by_category: list[EconomicDragItem]
    top_drain_category: str
    top_drain_daily_inr: float


class WardIntelligence(BaseModel):
    ward_name: str
    district_name: str | None
    wpi: float                        # 0-100, higher = better governance
    wpi_grade: str                    # A/B/C/D/F
    wpi_rank: int                     # 1 = best ward in Delhi
    total_complaints: int
    open_complaints: int
    resolution_rate: float            # %
    sla_compliance_rate: float        # % resolved within SLA
    avg_resolution_hours: float
    reopen_rate: float                # % closures that reopen = false closures
    economic_drag_daily_inr: float
    wpi_change_30d: float             # +ve = improving


class WardIndexReport(BaseModel):
    wards: list[WardIntelligence]
    city_avg_wpi: float
    total_wards_ranked: int
    top_5: list[str]
    bottom_5: list[str]
    total_economic_drag_daily: float
    wards_in_crisis: int              # WPI < 30


class ContractRecord(BaseModel):
    id: str
    contractor_name: str
    department: str
    ward_names: list[str]
    contract_type: str                # road/drainage/electrical/water/building
    value_lakh: float
    start_date: str
    end_date: str
    status: str                       # active/completed/terminated


class ContractorProfile(BaseModel):
    contractor_name: str
    total_contracts: int
    total_value_lakh: float
    avg_post_completion_complaint_spike_pct: float
    repeat_repair_rate: float         # % of work needing re-do within 6 months
    estimated_waste_lakh: float       # economic cost attributed to their failures
    risk_score: float                 # 0-100, higher = more risk
    risk_flag: str                    # GREEN/AMBER/RED
    flagged_contracts: list[str]      # contracts with high complaint correlation


class ContractorIntelligenceReport(BaseModel):
    contractors: list[ContractorProfile]
    total_estimated_waste_lakh: float
    red_flag_count: int
    recommendation: str


class PredictiveAlert(BaseModel):
    ward_name: str
    district_name: str | None
    alert_type: str                   # "complaint_spike" | "sla_crisis" | "seasonal"
    category: str
    predicted_spike_pct: int          # expected % increase in next 30 days
    confidence_pct: int               # model confidence
    days_until_peak: int
    estimated_complaints: int         # predicted volume
    economic_impact_if_ignored_lakh: float
    recommended_action: str
    urgency: str                      # CRITICAL/HIGH/MEDIUM


class PredictiveReport(BaseModel):
    alerts: list[PredictiveAlert]
    total_wards_at_risk: int
    highest_risk_category: str
    total_economic_risk_lakh: float
    monsoon_risk_score: int           # 0-100 (based on drainage/waterlogging patterns)
    pre_emptive_budget_recommendation_lakh: float


class GovernanceScorecard(BaseModel):
    """The CM's morning brief — one page, everything actionable."""
    date: str
    city_health_score: float          # 0-100 composite
    city_health_grade: str
    daily_economic_drag_inr: float
    daily_economic_drag_vs_last_week_pct: float
    # Top actions
    top_5_economic_drains: list[dict]   # category → ₹/day
    top_5_worst_wards: list[dict]       # ward → WPI
    top_5_contractor_risks: list[dict]  # contractor → waste estimate
    top_5_predictive_alerts: list[dict] # ward → risk
    # Week comparison
    wpi_improving_wards: int
    wpi_declining_wards: int
    complaints_filed_7d: int
    complaints_resolved_7d: int
    resolution_rate_7d: float
    # Recommendation
    chief_secretary_action_items: list[str]
