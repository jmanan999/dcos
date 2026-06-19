"""AI tables — ai_results and feedback_labels

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-19
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_results",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "grievance_id",
            UUID(as_uuid=True),
            sa.ForeignKey("grievances.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("model_version", sa.String(80), nullable=False),
        sa.Column("raw_response", JSONB, nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("subcategory", sa.String(100), nullable=True),
        sa.Column("department_code", sa.String(20), nullable=True),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("severity_score", sa.Integer, nullable=True),
        sa.Column("spam_score", sa.Float, nullable=True),
        sa.Column("sentiment_score", sa.Float, nullable=True),
        sa.Column("language", sa.String(10), nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_ai_results_grievance_id", "ai_results", ["grievance_id"])

    op.create_table(
        "feedback_labels",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "grievance_id",
            UUID(as_uuid=True),
            sa.ForeignKey("grievances.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("officer_id", sa.String(80), nullable=True),
        sa.Column("original_category", sa.String(100), nullable=True),
        sa.Column("corrected_category", sa.String(100), nullable=True),
        sa.Column("original_department_code", sa.String(20), nullable=True),
        sa.Column("corrected_department_code", sa.String(20), nullable=True),
        sa.Column("correction_note", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_feedback_labels_grievance_id", "feedback_labels", ["grievance_id"])


def downgrade() -> None:
    op.drop_table("feedback_labels")
    op.drop_table("ai_results")
