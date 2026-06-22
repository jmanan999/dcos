from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class GrievanceSummary(BaseModel):
    id: uuid.UUID
    tracking_id: str
    raw_text: str
    category: str | None
    subcategory: str | None
    severity: int | None
    status: str
    priority: str
    ward_id: uuid.UUID | None
    latitude: float | None
    longitude: float | None
    sla_due_at: datetime | None
    escalation_level: int
    is_emergency: bool
    created_at: datetime
    updated_at: datetime
    # Computed by the queue endpoint
    hours_until_breach: float | None = None
    is_sla_breached: bool = False

    model_config = {"from_attributes": True}


class OfficerNoteCreate(BaseModel):
    note: str = Field(..., min_length=5, max_length=2000)
    is_handoff: bool = False
    handoff_dept_id: uuid.UUID | None = None


class OfficerNoteRead(BaseModel):
    id: uuid.UUID
    grievance_id: uuid.UUID
    officer_id: str
    note: str
    is_handoff: bool
    handoff_dept_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProofVerificationResult(BaseModel):
    is_valid: bool
    has_before: bool
    has_after: bool
    geo_distance_m: float | None
    geo_ok: bool
    timestamp_ok: bool
    reasons: list[str]


class ClosureRequest(BaseModel):
    resolution_note: str = Field(..., min_length=10, max_length=2000)


class RequestInfoRequest(BaseModel):
    message: str = Field(..., min_length=10, max_length=1000)


class EscalateRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)


class WorkloadSummary(BaseModel):
    officer_id: uuid.UUID
    officer_name: str | None
    department_id: uuid.UUID
    total_assigned: int
    in_progress: int
    sla_breached: int
    avg_resolution_hours: float | None
    is_available: bool


# ── E2.1: Route optimization ──────────────────────────────────────────────────


class RouteStop(BaseModel):
    id: uuid.UUID
    tracking_id: str
    category: str | None
    latitude: float
    longitude: float
    is_sla_breached: bool
    priority: str


class RouteCluster(BaseModel):
    label: str  # e.g. "Rohini Sector 9 area"
    ward_name: str | None
    stops: list[RouteStop]
    estimated_minutes: int  # total field time for this cluster
    google_maps_url: str  # multi-stop directions URL


class RoutePlan(BaseModel):
    clusters: list[RouteCluster]
    total_stops: int
    unclustered: int  # complaints with no GPS, can't be routed
    naive_minutes: int  # time if each handled separately
    optimised_minutes: int  # time with clustering
    minutes_saved: int


# ── E2.2: Officer performance scorecard ───────────────────────────────────────


class OfficerScorecard(BaseModel):
    officer_id: uuid.UUID
    officer_name: str | None
    open_cases: int
    resolved_7d: int
    resolved_30d: int
    avg_resolution_hours: float | None
    sla_breaches: int
    false_closure_rate: float  # % of resolutions that reopened within 30d
    avg_csat: float | None
    dept_rank: int  # 1 = best in department
    dept_total_officers: int
    performance_grade: str  # A/B/C/D/F


# ── E2.3: Full case file ──────────────────────────────────────────────────────


class CaseFileAttachment(BaseModel):
    url: str
    file_type: str
    is_proof: bool
    proof_type: str | None
    created_at: datetime


class CaseFileEvent(BaseModel):
    from_status: str | None
    to_status: str
    actor_role: str | None
    note: str | None
    ts: datetime


class FullCaseFile(BaseModel):
    tracking_id: str
    raw_text: str
    category: str | None
    subcategory: str | None
    status: str
    priority: str
    latitude: float | None
    longitude: float | None
    created_at: datetime
    attachments: list[CaseFileAttachment]
    notes: list[OfficerNoteRead]
    timeline: list[CaseFileEvent]
    previous_departments: list[str]  # depts this case passed through (handoff trail)


# ── E2.4: Checklists ──────────────────────────────────────────────────────────


class ChecklistStep(BaseModel):
    id: uuid.UUID
    step_order: int
    step_label: str
    step_label_hi: str | None
    requires_photo: bool
    completed: bool = False
    completed_note: str | None = None


class ChecklistStatus(BaseModel):
    category: str
    steps: list[ChecklistStep]
    total: int
    completed: int
    all_complete: bool


class ChecklistCompleteRequest(BaseModel):
    checklist_id: uuid.UUID
    note: str | None = Field(default=None, max_length=500)
