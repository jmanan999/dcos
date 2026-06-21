from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

# ── Inbound ───────────────────────────────────────────────────────────────────


class LocationInput(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class GrievanceCreate(BaseModel):
    raw_text: str = Field(..., min_length=10, max_length=5000)
    channel: str = Field(default="web")
    language: str = Field(default="hi")
    location: LocationInput | None = None
    citizen_phone: str | None = None
    idempotency_key: str = Field(..., min_length=8, max_length=128)
    # Optional: pre-populated by WhatsApp/IVR adapters
    channel_meta: dict[str, Any] | None = None

    @field_validator("channel")
    @classmethod
    def valid_channel(cls, v: str) -> str:
        allowed = {"web", "whatsapp", "ivr", "api", "walk_in"}
        if v not in allowed:
            raise ValueError(f"channel must be one of {allowed}")
        return v

    @field_validator("language")
    @classmethod
    def valid_language(cls, v: str) -> str:
        allowed = {"hi", "en", "pa", "ur", "bn", "ta", "te", "mr"}
        if v not in allowed:
            return "hi"
        return v

    @field_validator("citizen_phone")
    @classmethod
    def e164(cls, v: str | None) -> str | None:
        if v and not v.startswith("+"):
            raise ValueError("phone must be E.164 (+91...)")
        return v


class WhatsAppTextMessage(BaseModel):
    from_number: str
    message_id: str
    text: str
    timestamp: int


class WhatsAppMediaMessage(BaseModel):
    from_number: str
    message_id: str
    media_id: str
    media_type: str  # image | audio | video | document
    caption: str | None = None
    timestamp: int


class WhatsAppLocationMessage(BaseModel):
    from_number: str
    message_id: str
    latitude: float
    longitude: float
    timestamp: int


# ── Outbound ──────────────────────────────────────────────────────────────────


class AttachmentRead(BaseModel):
    id: uuid.UUID
    url: str
    file_type: str
    file_size: int | None
    is_proof: bool
    proof_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StatusEventRead(BaseModel):
    from_status: str | None
    to_status: str
    actor_role: str | None
    note: str | None
    ts: datetime

    model_config = {"from_attributes": True}


class GrievanceRead(BaseModel):
    id: uuid.UUID
    tracking_id: str
    channel: str
    raw_text: str
    language: str
    category: str | None
    subcategory: str | None
    severity: int | None
    department_id: uuid.UUID | None
    status: str
    priority: str
    ward_id: uuid.UUID | None
    latitude: float | None
    longitude: float | None
    is_emergency: bool
    is_anonymous: bool
    sla_due_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CitizenRight(BaseModel):
    category: str
    sla_days: int
    legal_basis: str
    department: str
    escalation_after_days: int
    penalty_info: str


class GrievanceCreateResponse(BaseModel):
    grievance_id: uuid.UUID
    tracking_id: str
    status: str
    is_emergency: bool
    emergency_guidance: str | None = None
    message: str
    citizen_right: CitizenRight | None = None
    # How many other citizens have the same complaint in this ward right now
    cluster_size: int = 0


class TrackingResponse(BaseModel):
    tracking_id: str
    status: str
    priority: str
    category: str | None
    department_id: uuid.UUID | None
    created_at: datetime
    sla_due_at: datetime | None
    timeline: list[StatusEventRead]
    attachments: list[AttachmentRead]


class TranscribeResponse(BaseModel):
    text: str
    detected_language: str | None = None
