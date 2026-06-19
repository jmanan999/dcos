from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class UserRead(BaseModel):
    id: uuid.UUID
    phone: str | None
    email: str | None
    name: str | None
    role: str
    language_pref: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = None
    language_pref: str | None = None

    @field_validator("language_pref")
    @classmethod
    def valid_lang(cls, v: str | None) -> str | None:
        if v and v not in ("hi", "en", "pa", "ur", "bn", "ta", "te", "mr"):
            raise ValueError("unsupported language code")
        return v


class DepartmentRead(BaseModel):
    id: uuid.UUID
    name: str
    short_code: str
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class OfficerRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    department_id: uuid.UUID
    designation: str | None
    employee_id: str | None
    is_available: bool
    max_active_cases: int

    model_config = {"from_attributes": True}


class OfficerCreate(BaseModel):
    user_id: uuid.UUID
    department_id: uuid.UUID
    designation: str | None = None
    employee_id: str | None = None
    max_active_cases: int = 50


class OfficerUpdate(BaseModel):
    designation: str | None = None
    is_available: bool | None = None
    max_active_cases: int | None = None


class PhoneClaimRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def e164(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("phone must be in E.164 format (+91...)")
        return v


class PhoneClaimResponse(BaseModel):
    linked_grievances: int


class TokenRequest(BaseModel):
    """Local-dev / test only — issue a signed JWT directly."""

    user_id: str | None = None
    role: str = "citizen"
    department_id: str | None = None
    name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    department_id: str | None


class PermissionsResponse(BaseModel):
    role: str
    permissions: list[str]
