import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AIResult(Base):
    """Stores the raw AI enrichment output for each grievance (for audit + retraining)."""
    __tablename__ = "ai_results"
    __table_args__ = (Index("ix_ai_results_grievance_id", "grievance_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grievance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("grievances.id", ondelete="CASCADE"),
        nullable=False, unique=True,
    )
    model_version: Mapped[str] = mapped_column(String(80), nullable=False)
    raw_response: Mapped[dict] = mapped_column(JSONB, nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spam_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FeedbackLabel(Base):
    """Officer corrections to AI classification — labeled dataset for fine-tuning."""
    __tablename__ = "feedback_labels"
    __table_args__ = (Index("ix_feedback_labels_grievance_id", "grievance_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grievance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("grievances.id", ondelete="CASCADE"), nullable=False
    )
    officer_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    original_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    corrected_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    original_department_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    corrected_department_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    correction_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
