from __future__ import annotations

from pydantic import BaseModel, Field


class CSVExportParams(BaseModel):
    department_id: str | None = None
    status: str | None = None
    days: int = Field(default=30, ge=1, le=365)


class ReportResponse(BaseModel):
    report_type: str
    format: str
    rows: int
    content: str  # CSV text or base64-encoded binary
    filename: str
