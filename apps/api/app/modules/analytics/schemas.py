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
