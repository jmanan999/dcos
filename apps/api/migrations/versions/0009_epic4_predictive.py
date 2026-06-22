"""Epic 4 — Predictive Governance & Policy Simulation

Adds:
  - ward_wpi_history     (weekly WPI snapshots per ward for trend detection)
  - officer_burnout_scores (computed weekly from caseload + breach + CSAT)
  + backfills 12 weeks of WPI snapshots from live grievance data

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-22
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── E4.4: ward_wpi_history ────────────────────────────────────────────────
    op.create_table(
        "ward_wpi_history",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "ward_id",
            UUID(as_uuid=True),
            sa.ForeignKey("wards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("snapshot_date", sa.Date, nullable=False),
        sa.Column("wpi", sa.Numeric(6, 2), nullable=False),
        sa.Column("wpi_grade", sa.String(2), nullable=False),
        sa.Column("total_complaints", sa.Integer, nullable=False, server_default="0"),
        sa.Column("open_complaints", sa.Integer, nullable=False, server_default="0"),
        sa.Column("resolution_rate", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("sla_compliance_rate", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("avg_resolution_hours", sa.Numeric(8, 2), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("ward_id", "snapshot_date", name="uq_ward_wpi_snapshot"),
    )
    op.create_index("ix_ward_wpi_history_ward_id", "ward_wpi_history", ["ward_id"])
    op.create_index("ix_ward_wpi_history_snapshot_date", "ward_wpi_history", ["snapshot_date"])

    # ── E4.2: officer_burnout_scores ─────────────────────────────────────────
    op.create_table(
        "officer_burnout_scores",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column("officer_id", sa.String(80), nullable=False),
        sa.Column("department_id", UUID(as_uuid=True), nullable=True),
        sa.Column(
            "computed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("open_cases", sa.Integer, nullable=False, server_default="0"),
        sa.Column("breach_rate_pct", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("avg_csat", sa.Numeric(4, 2), nullable=True),
        sa.Column("csat_decline_pct", sa.Numeric(6, 2), nullable=True),
        sa.Column("burnout_score", sa.Numeric(6, 2), nullable=False, server_default="0"),
        sa.Column("risk_level", sa.String(10), nullable=False, server_default="'LOW'"),
        sa.Column("alert_sent", sa.Boolean, nullable=False, server_default="false"),
    )
    op.create_index("ix_officer_burnout_officer_id", "officer_burnout_scores", ["officer_id"])
    op.create_index("ix_officer_burnout_computed_at", "officer_burnout_scores", ["computed_at"])
    op.create_index("ix_officer_burnout_risk_level", "officer_burnout_scores", ["risk_level"])

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ward_wpi_history TO dcos_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON officer_burnout_scores TO dcos_app")

    # ── E4.X: Backfill 12 weekly WPI snapshots from live grievance data ───────
    # Use WITH ... INSERT syntax (PostgreSQL writable CTE) to avoid FILTER chain errors.
    op.execute(
        sa.text("""
        WITH weeks AS (
            SELECT generate_series(0, 11) AS w
        ),
        ward_stats AS (
            SELECT
                g.ward_id,
                DATE_TRUNC('week', NOW() - (w.w * INTERVAL '7 days'))::date AS snap_date,
                COUNT(*) AS total,
                COUNT(CASE WHEN g.status NOT IN
                    ('RECEIVED','CLASSIFIED','ASSIGNED','IN_PROGRESS','ACTION_TAKEN')
                    THEN 1 END) AS resolved_cnt,
                COUNT(CASE WHEN g.status NOT IN
                    ('RECEIVED','CLASSIFIED','ASSIGNED','IN_PROGRESS','ACTION_TAKEN')
                    AND (g.sla_due_at IS NULL OR g.closed_at <= g.sla_due_at)
                    THEN 1 END) AS sla_ok,
                COUNT(CASE WHEN g.status IN
                    ('RECEIVED','CLASSIFIED','ASSIGNED','IN_PROGRESS','ACTION_TAKEN')
                    THEN 1 END) AS open_cnt,
                AVG(CASE WHEN g.closed_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (g.closed_at - g.created_at)) / 3600.0
                    END) AS avg_hours
            FROM grievances g
            CROSS JOIN weeks w
            WHERE g.created_at <= DATE_TRUNC('week', NOW() - (w.w * INTERVAL '7 days'))
              AND g.ward_id IS NOT NULL
            GROUP BY g.ward_id, snap_date
            HAVING COUNT(*) >= 1
        ),
        scored AS (
            SELECT
                ward_id,
                snap_date,
                total,
                open_cnt,
                ROUND((resolved_cnt::numeric / GREATEST(total, 1)) * 100, 2) AS res_rate,
                ROUND((sla_ok::numeric / GREATEST(resolved_cnt, 1)) * 100, 2) AS sla_rate,
                avg_hours,
                LEAST(100, GREATEST(0, ROUND(
                    (resolved_cnt::numeric / GREATEST(total, 1)) * 100 * 0.35
                    + (sla_ok::numeric / GREATEST(resolved_cnt, 1)) * 100 * 0.25
                    + GREATEST(0, 100 - COALESCE(avg_hours, 72) / 72.0 * 100) * 0.20
                    + 50 * 0.20
                , 2))) AS wpi
            FROM ward_stats
        )
        INSERT INTO ward_wpi_history
            (id, ward_id, snapshot_date, wpi, wpi_grade, total_complaints,
             open_complaints, resolution_rate, sla_compliance_rate, avg_resolution_hours)
        SELECT
            uuid_generate_v4(),
            ward_id,
            snap_date,
            wpi,
            CASE
                WHEN wpi >= 75 THEN 'A'
                WHEN wpi >= 60 THEN 'B'
                WHEN wpi >= 45 THEN 'C'
                WHEN wpi >= 30 THEN 'D'
                ELSE 'F'
            END,
            total,
            open_cnt,
            res_rate,
            sla_rate,
            ROUND(avg_hours::numeric, 2)
        FROM scored
        ON CONFLICT (ward_id, snapshot_date) DO NOTHING
    """)
    )


def downgrade() -> None:
    op.drop_table("officer_burnout_scores")
    op.drop_table("ward_wpi_history")
