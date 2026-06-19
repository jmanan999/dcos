from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class SLAStatus(BaseModel):
    grievance_id: uuid.UUID
    sla_due_at: datetime | None
    escalation_level: int
    status: str
    is_breached: bool
    hours_remaining: float | None


class EscalationEvent(BaseModel):
    grievance_id: uuid.UUID
    level: int
    escalated_to_role: str
    reason: str | None
    ts: datetime

    model_config = {"from_attributes": True}
