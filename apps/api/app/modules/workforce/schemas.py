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
