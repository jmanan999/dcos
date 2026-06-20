from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AdapterConfig(BaseModel):
    department_id: str
    adapter_type: Literal["rest", "email", "file"]
    endpoint_url: str | None = None
    auth_header: str | None = None
    polling_interval_minutes: int = Field(default=15, ge=1, le=1440)


class SyncRecord(BaseModel):
    id: str
    department_id: str
    adapter_type: str
    direction: Literal["inbound", "outbound"]
    status: Literal["pending", "success", "failed"]
    grievance_id: str | None = None
    external_ref: str | None = None
    error: str | None = None
    created_at: datetime
    synced_at: datetime | None = None

    model_config = {"from_attributes": True}


class SyncStatusResponse(BaseModel):
    department: str
    adapter_type: str
    last_sync_at: datetime | None
    pending_count: int
    failed_count: int
