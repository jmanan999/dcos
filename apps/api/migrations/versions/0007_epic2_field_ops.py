"""Epic 2 — Field Operations Intelligence

Adds:
  - attachments.file_hash (MD5 dedup for proof integrity)
  - complaint_checklists (per-category quality checklists)
  - checklist_completions (officer's checklist progress per grievance)

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-22
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── E2.5: MD5 hash on attachments for duplicate proof detection ───────────
    op.add_column("attachments", sa.Column("file_hash", sa.String(64), nullable=True))
    op.create_index("ix_attachments_file_hash", "attachments", ["file_hash"])

    # ── E2.4: Department-specific quality checklists ──────────────────────────
    op.create_table(
        "complaint_checklists",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("step_order", sa.Integer, nullable=False),
        sa.Column("step_label", sa.String(200), nullable=False),
        sa.Column("step_label_hi", sa.String(200), nullable=True),
        sa.Column("requires_photo", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )
    op.create_index("ix_checklists_category", "complaint_checklists", ["category"])

    op.create_table(
        "checklist_completions",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "grievance_id",
            UUID(as_uuid=True),
            sa.ForeignKey("grievances.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "checklist_id",
            UUID(as_uuid=True),
            sa.ForeignKey("complaint_checklists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("officer_id", sa.String(80), nullable=False),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("grievance_id", "checklist_id", name="uq_grievance_checklist"),
    )
    op.create_index("ix_checklist_completions_grievance", "checklist_completions", ["grievance_id"])

    # Grants for the non-superuser app role
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON complaint_checklists TO dcos_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON checklist_completions TO dcos_app")

    # ── Seed checklists for 6 high-volume categories ──────────────────────────
    # (category, order, en, hi, requires_photo)
    seed = [
        ("Pothole / Road Damage", 1, "Before photo of damaged road", "क्षतिग्रस्त सड़क की फोटो", True),
        (
            "Pothole / Road Damage",
            2,
            "Material type logged (cold-mix / hot-mix)",
            "सामग्री दर्ज करें",
            False,
        ),
        ("Pothole / Road Damage", 3, "Area measured (sq. metres)", "क्षेत्र मापें (वर्ग मीटर)", False),
        ("Pothole / Road Damage", 4, "After photo showing repaired surface", "मरम्मत की फोटो", True),
        ("Pothole / Road Damage", 5, "Surface smoothness verified", "सतह की समतलता जाँचें", False),
        ("Road Repair Required", 1, "Before photo of road condition", "सड़क की फोटो", True),
        ("Road Repair Required", 2, "Material type logged", "सामग्री दर्ज करें", False),
        ("Road Repair Required", 3, "After photo of completed work", "पूर्ण कार्य की फोटो", True),
        ("Streetlight Not Working", 1, "Before photo (fault visible)", "खराबी की फोटो", True),
        (
            "Streetlight Not Working",
            2,
            "Fault diagnosed (wiring / bulb / pole)",
            "खराबी की पहचान",
            False,
        ),
        ("Streetlight Not Working", 3, "Component replaced", "पुर्जा बदला गया", False),
        (
            "Streetlight Not Working",
            4,
            "After photo (light working at night)",
            "रात में जलती लाइट की फोटो",
            True,
        ),
        ("No Water Supply", 1, "Site inspection done", "स्थल निरीक्षण", False),
        ("No Water Supply", 2, "Cause identified (pipe / pump / supply)", "कारण की पहचान", False),
        ("No Water Supply", 3, "Supply restored & verified", "आपूर्ति बहाल", False),
        ("No Water Supply", 4, "Photo of running water at source", "बहते पानी की फोटो", True),
        ("Sewage Overflow", 1, "Before photo of overflow", "ओवरफ्लो की फोटो", True),
        ("Sewage Overflow", 2, "Blockage cleared", "रुकावट हटाई गई", False),
        ("Sewage Overflow", 3, "Area sanitised", "क्षेत्र की सफाई", False),
        ("Sewage Overflow", 4, "After photo of cleared drain", "साफ नाली की फोटो", True),
        ("Garbage Not Collected", 1, "Before photo of garbage", "कचरे की फोटो", True),
        ("Garbage Not Collected", 2, "Garbage cleared", "कचरा हटाया गया", False),
        ("Garbage Not Collected", 3, "After photo of clean area", "साफ क्षेत्र की फोटो", True),
    ]
    for category, order, en, hi, photo in seed:
        op.execute(
            sa.text("""
                INSERT INTO complaint_checklists
                    (id, category, step_order, step_label, step_label_hi, requires_photo, is_active)
                VALUES (uuid_generate_v4(), :cat, :ord, :en, :hi, :photo, true)
            """).bindparams(cat=category, ord=order, en=en, hi=hi, photo=photo)
        )


def downgrade() -> None:
    op.drop_table("checklist_completions")
    op.drop_table("complaint_checklists")
    op.drop_index("ix_attachments_file_hash", table_name="attachments")
    op.drop_column("attachments", "file_hash")
