import enum
import uuid
from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class GrievanceStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    CLASSIFIED = "CLASSIFIED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    ACTION_TAKEN = "ACTION_TAKEN"
    RESOLVED = "RESOLVED"
    VERIFIED = "VERIFIED"
    REOPENED = "REOPENED"
    CLOSED = "CLOSED"
    REJECTED_SPAM = "REJECTED_SPAM"
    ESCALATED = "ESCALATED"

    # Legal transitions (source → set of valid targets)
    @classmethod
    def allowed_transitions(cls) -> dict["GrievanceStatus", set["GrievanceStatus"]]:
        return {
            cls.RECEIVED: {cls.CLASSIFIED, cls.REJECTED_SPAM},
            cls.CLASSIFIED: {cls.ASSIGNED, cls.REJECTED_SPAM},
            cls.ASSIGNED: {cls.IN_PROGRESS, cls.ESCALATED, cls.CLASSIFIED},
            cls.IN_PROGRESS: {cls.ACTION_TAKEN, cls.ESCALATED, cls.ASSIGNED},
            cls.ACTION_TAKEN: {cls.RESOLVED, cls.IN_PROGRESS},
            cls.RESOLVED: {cls.VERIFIED, cls.REOPENED},
            cls.VERIFIED: {cls.CLOSED, cls.REOPENED},
            cls.REOPENED: {cls.ASSIGNED, cls.ESCALATED},
            cls.ESCALATED: {cls.ASSIGNED, cls.CLOSED},
            cls.CLOSED: set(),
            cls.REJECTED_SPAM: set(),
        }


class Channel(str, enum.Enum):
    WEB = "web"
    WHATSAPP = "whatsapp"
    IVR = "ivr"
    API = "api"
    WALK_IN = "walk_in"


class Priority(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AttachmentType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"


class ProofType(str, enum.Enum):
    BEFORE = "before"
    AFTER = "after"
    DURING = "during"


class Grievance(Base):
    __tablename__ = "grievances"
    __table_args__ = (
        # Composite for officer queue queries (dept × status × SLA clock)
        Index("ix_grievances_dept_status_sla", "department_id", "status", "sla_due_at"),
        # Composite for ward-level hotspot aggregation
        Index("ix_grievances_ward_status", "ward_id", "status"),
        # Fast citizen lookup
        Index("ix_grievances_citizen_id", "citizen_id"),
        # Cluster membership
        Index("ix_grievances_cluster_id", "cluster_id"),
        # Tracking ID (human-readable external reference)
        Index("ix_grievances_tracking_id", "tracking_id", unique=True),
        # GiST spatial index on location — created as raw SQL in migration
        # HNSW vector index on embedding — created as raw SQL in migration
        # GIN trigram index on raw_text — created as raw SQL in migration
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_id: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)

    # ── Who filed it ──────────────────────────────────────────────────────────
    citizen_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    citizen_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Raw intake ────────────────────────────────────────────────────────────
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="hi")

    # ── AI-enriched fields (populated by ai module worker) ────────────────────
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    severity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    spam_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    # pgvector 768-dim embedding; HNSW index added via raw SQL in migration
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True)

    # ── Routing ────────────────────────────────────────────────────────────────
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    assigned_officer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("officers.id", ondelete="SET NULL"), nullable=True
    )

    # ── State machine ─────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=GrievanceStatus.RECEIVED)
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default=Priority.MEDIUM)

    # ── Geography ─────────────────────────────────────────────────────────────
    ward_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wards.id", ondelete="SET NULL"), nullable=True
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    # location geography(POINT,4326) — GiST-indexed, added via raw SQL in migration

    # ── Clustering ────────────────────────────────────────────────────────────
    cluster_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("grievance_clusters.id", ondelete="SET NULL"), nullable=True
    )

    # ── SLA ───────────────────────────────────────────────────────────────────
    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escalation_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Flags ─────────────────────────────────────────────────────────────────
    is_emergency: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Extra channel-specific data (WhatsApp message id, IVR call sid, etc.) ─
    # Note: use Python attr `extra` but DB column `channel_meta` to avoid SQLAlchemy's
    # reserved `metadata` attribute.
    channel_meta: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class GrievanceCluster(Base):
    """
    A cluster groups related grievances (same category + geo proximity).
    master_grievance_id is the canonical / most-representative complaint.
    """
    __tablename__ = "grievance_clusters"
    __table_args__ = (Index("ix_clusters_dept_category", "department_id", "category"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    ward_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wards.id", ondelete="SET NULL"), nullable=True
    )
    master_grievance_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    centroid_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    centroid_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class StatusEvent(Base):
    """
    Append-only log of every status transition. Source of truth for the timeline
    view and accountability reporting. Never UPDATE or DELETE rows.
    """
    __tablename__ = "status_events"
    __table_args__ = (
        Index("ix_status_events_grievance_id", "grievance_id"),
        Index("ix_status_events_ts", "ts"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grievance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("grievances.id", ondelete="CASCADE"), nullable=False
    )
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(40), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Attachment(Base):
    __tablename__ = "attachments"
    __table_args__ = (
        Index("ix_attachments_grievance_id", "grievance_id"),
        Index("ix_attachments_is_proof", "is_proof"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grievance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("grievances.id", ondelete="CASCADE"), nullable=False
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # EXIF-extracted or user-provided location
    exif_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    exif_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Is this a closure proof photo? (before/after)
    is_proof: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    proof_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    uploaded_by_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
