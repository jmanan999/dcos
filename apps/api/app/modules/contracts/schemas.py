from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel

# ── Contracts ─────────────────────────────────────────────────────────────────


class ContractCreate(BaseModel):
    contractor_name: str
    gst_number: str | None = None
    department_id: uuid.UUID
    ward_ids: list[uuid.UUID] = []
    contract_type: str
    value_lakh: float
    tender_id: str | None = None
    start_date: date
    end_date: date | None = None
    status: str = "active"
    notes: str | None = None


class ContractRead(BaseModel):
    id: uuid.UUID
    contractor_name: str
    gst_number: str | None
    department_id: uuid.UUID
    department_name: str | None
    ward_ids: list[uuid.UUID]
    contract_type: str
    value_lakh: float
    tender_id: str | None
    start_date: date
    end_date: date | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    performance: ContractPerformanceRead | None = None


class ContractUpdate(BaseModel):
    contractor_name: str | None = None
    gst_number: str | None = None
    ward_ids: list[uuid.UUID] | None = None
    contract_type: str | None = None
    value_lakh: float | None = None
    tender_id: str | None = None
    end_date: date | None = None
    status: str | None = None
    notes: str | None = None


# ── Contractor Performance ────────────────────────────────────────────────────


class ContractPerformanceRead(BaseModel):
    id: uuid.UUID
    contract_id: uuid.UUID
    computed_at: datetime
    complaint_category: str | None
    baseline_weekly_rate: float | None
    post_work_weekly_rate: float | None
    spike_pct: float | None
    is_flagged: bool
    economic_waste_lakh: float | None


# ── Contractor Scorecard (public) ─────────────────────────────────────────────


class ContractProject(BaseModel):
    contract_id: str
    department: str
    contract_type: str
    value_lakh: float
    start_date: str
    end_date: str | None
    spike_pct: float | None
    is_flagged: bool
    economic_waste_lakh: float | None


class ContractorScorecardRow(BaseModel):
    contractor_name: str
    gst_number: str | None
    total_contracts: int
    total_value_lakh: float
    avg_spike_pct: float | None
    max_spike_pct: float | None
    flagged_contracts: int
    total_economic_waste_lakh: float
    risk_level: str  # green / yellow / red
    projects: list[ContractProject]


class ContractorScorecardReport(BaseModel):
    contractors: list[ContractorScorecardRow]
    total_contractors: int
    flagged_contractors: int
    total_estimated_waste_lakh: float
    computed_at: datetime


# ── Budget Allocations ────────────────────────────────────────────────────────


class BudgetAllocationCreate(BaseModel):
    department_id: uuid.UUID
    fiscal_year: str
    period: str
    amount_crore: float
    notes: str | None = None


class BudgetAllocationRead(BaseModel):
    id: uuid.UUID
    department_id: uuid.UUID
    department_name: str | None
    fiscal_year: str
    period: str
    amount_crore: float
    notes: str | None
    created_at: datetime


# ── Budget Outcomes ───────────────────────────────────────────────────────────


class BudgetOutcomeRow(BaseModel):
    department: str
    department_id: str
    budget_allocated_crore: float | None
    complaints_before: int
    complaints_after: int
    change_pct: float | None
    economic_drag_before_lakh: float | None
    economic_drag_after_lakh: float | None
    roi_grade: str  # A / B / C / D / F / NA


class BudgetOutcomeReport(BaseModel):
    fiscal_year: str
    period: str
    rows: list[BudgetOutcomeRow]
    total_budget_crore: float
    avg_complaint_change_pct: float | None
    computed_at: datetime


# ── Ward Representatives ──────────────────────────────────────────────────────


class WardRepresentativeRead(BaseModel):
    id: uuid.UUID
    ward_id: uuid.UUID
    ward_name: str | None
    ward_number: int | None
    representative_name: str
    party: str
    constituency: str | None
    term_start: date
    term_end: date | None
    is_current: bool
