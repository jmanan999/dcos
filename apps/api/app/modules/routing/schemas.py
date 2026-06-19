from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class AssignmentRequest(BaseModel):
    grievance_id: uuid.UUID
    force_department_code: str | None = None
    force_officer_id: uuid.UUID | None = None


class AssignmentResult(BaseModel):
    grievance_id: uuid.UUID
    assigned_officer_id: uuid.UUID | None
    department_id: uuid.UUID | None
    sla_due_at: datetime | None
    status: str
    message: str
