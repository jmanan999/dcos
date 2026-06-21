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
