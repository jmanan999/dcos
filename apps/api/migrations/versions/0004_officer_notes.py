"""officer_notes table

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-19
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "officer_notes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("grievance_id", UUID(as_uuid=True),
                  sa.ForeignKey("grievances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("officer_id", sa.String(80), nullable=False),
        sa.Column("note", sa.Text, nullable=False),
        sa.Column("is_handoff", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("handoff_dept_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_officer_notes_grievance_id", "officer_notes", ["grievance_id"])

    # Grant access to dcos_app (non-superuser role)
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON officer_notes TO dcos_app")


def downgrade() -> None:
    op.drop_table("officer_notes")
