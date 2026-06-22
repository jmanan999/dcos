from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = (
        Index("ix_contracts_department_id", "department_id"),
        Index("ix_contracts_status", "status"),
        Index("ix_contracts_contractor_name", "contractor_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contractor_name: Mapped[str] = mapped_column(String(200), nullable=False)
    gst_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False
    )
    ward_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )
    contract_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value_lakh: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tender_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ContractorPerformance(Base):
    __tablename__ = "contractor_performance"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False
    )
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    complaint_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    baseline_weekly_rate: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    post_work_weekly_rate: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    spike_pct: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    economic_waste_lakh: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)


class BudgetAllocation(Base):
    __tablename__ = "budget_allocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False
    )
    fiscal_year: Mapped[str] = mapped_column(String(10), nullable=False)
    period: Mapped[str] = mapped_column(String(20), nullable=False)
    amount_crore: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WardRepresentative(Base):
    __tablename__ = "ward_representatives"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ward_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wards.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    representative_name: Mapped[str] = mapped_column(String(200), nullable=False)
    party: Mapped[str] = mapped_column(String(50), nullable=False)
    constituency: Mapped[str | None] = mapped_column(String(200), nullable=True)
    term_start: Mapped[date] = mapped_column(Date, nullable=False)
    term_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
