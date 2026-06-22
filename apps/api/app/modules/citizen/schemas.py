from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class FeedbackRead(BaseModel):
    id: uuid.UUID
    grievance_id: uuid.UUID
    rating: int
    comment: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReopenRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=1000)


class NotificationRead(BaseModel):
    id: uuid.UUID
    channel: str
    message: str
    status: str
    created_at: datetime
    sent_at: datetime | None = None

    model_config = {"from_attributes": True}


class CategoryStat(BaseModel):
    category: str
    count: int


class DeptStat(BaseModel):
    department: str
    total: int
    resolved: int
    resolution_rate: float


class HotspotPoint(BaseModel):
    ward_name: str
    lat: float | None = None
    lng: float | None = None
    open_count: int
    total_count: int


class PublicKPISnapshot(BaseModel):
    total_filed: int
    total_resolved: int
    total_open: int
    avg_resolution_hours: float | None
    by_category: list[CategoryStat]
    by_department: list[DeptStat]
    hotspots: list[HotspotPoint]
