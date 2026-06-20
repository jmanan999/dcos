"""analytics materialized views + notification_preferences

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-20

Creates:
  - notification_preferences table (per-user channel opt-in/out + consent)
  - mv_grievances_daily  — daily rollup by dept × category
  - mv_ward_stats        — ward-level open/total/resolution-time aggregation
  - mv_dept_stats        — department performance leaderboard
  - Cron-style refresh function: refresh_analytics_views()
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── notification_preferences ──────────────────────────────────────────────
    op.create_table(
        "notification_preferences",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("channel_whatsapp", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("channel_sms", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("channel_push", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("opted_out", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("consent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_notif_prefs_user_id", "notification_preferences", ["user_id"])

    # ── Materialized views ────────────────────────────────────────────────────

    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_grievances_daily AS
        SELECT
            date_trunc('day', g.created_at AT TIME ZONE 'Asia/Kolkata') AS day,
            d.name                                                         AS department,
            g.category,
            COUNT(*)                                                        AS total,
            COUNT(*) FILTER (WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')) AS resolved,
            COUNT(*) FILTER (WHERE g.status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS open,
            ROUND(AVG(g.severity), 1)                                      AS avg_severity,
            ROUND(
                AVG(
                    EXTRACT(EPOCH FROM (g.closed_at - g.created_at)) / 3600.0
                ) FILTER (WHERE g.closed_at IS NOT NULL),
            1)                                                              AS avg_resolution_hours
        FROM grievances g
        LEFT JOIN departments d ON d.id = g.department_id
        GROUP BY 1, 2, 3
        ORDER BY 1 DESC, total DESC
        WITH DATA
    """)
    op.execute("""
        CREATE UNIQUE INDEX ix_mv_grievances_daily
            ON mv_grievances_daily (day, department, category)
    """)

    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ward_stats AS
        SELECT
            w.id          AS ward_id,
            w.name        AS ward_name,
            dist.name     AS district_name,
            w.centroid_lat,
            w.centroid_lng,
            COUNT(*)                                                        AS total,
            COUNT(*) FILTER (WHERE g.status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS open,
            COUNT(*) FILTER (WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')) AS resolved,
            ROUND(
                AVG(
                    EXTRACT(EPOCH FROM (g.closed_at - g.created_at)) / 3600.0
                ) FILTER (WHERE g.closed_at IS NOT NULL),
            1)                                                              AS avg_resolution_hours,
            COUNT(*) FILTER (WHERE g.sla_due_at < now() AND g.status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS sla_breaches
        FROM grievances g
        JOIN wards w ON w.id = g.ward_id
        LEFT JOIN districts dist ON dist.id = w.district_id
        GROUP BY w.id, w.name, dist.name, w.centroid_lat, w.centroid_lng
        WITH DATA
    """)
    op.execute("CREATE UNIQUE INDEX ix_mv_ward_stats ON mv_ward_stats (ward_id)")

    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dept_stats AS
        SELECT
            d.id                                                            AS department_id,
            d.name                                                          AS department,
            COUNT(*)                                                        AS total,
            COUNT(*) FILTER (WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED')) AS resolved,
            COUNT(*) FILTER (WHERE g.status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS open,
            COUNT(*) FILTER (WHERE g.sla_due_at < now() AND g.status NOT IN ('RESOLVED','VERIFIED','CLOSED','REJECTED_SPAM')) AS sla_breaches,
            ROUND(
                100.0 * COUNT(*) FILTER (WHERE g.status IN ('RESOLVED','VERIFIED','CLOSED'))
                / NULLIF(COUNT(*), 0),
            1)                                                              AS resolution_rate,
            ROUND(
                AVG(
                    EXTRACT(EPOCH FROM (g.closed_at - g.created_at)) / 3600.0
                ) FILTER (WHERE g.closed_at IS NOT NULL),
            1)                                                              AS avg_resolution_hours,
            ROUND(AVG(f.rating) FILTER (WHERE f.rating IS NOT NULL), 2)    AS avg_csat,
            COUNT(f.id) FILTER (WHERE f.rating IS NOT NULL)                AS csat_count,
            ROUND(
                100.0 * COUNT(*) FILTER (WHERE g.status = 'REOPENED')
                / NULLIF(COUNT(*), 0),
            1)                                                              AS reopen_rate
        FROM grievances g
        JOIN departments d ON d.id = g.department_id
        LEFT JOIN feedback f ON f.grievance_id = g.id
        GROUP BY d.id, d.name
        ORDER BY resolution_rate DESC NULLS LAST
        WITH DATA
    """)
    op.execute("CREATE UNIQUE INDEX ix_mv_dept_stats ON mv_dept_stats (department_id)")

    # ── Refresh helper ────────────────────────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION refresh_analytics_views()
        RETURNS void LANGUAGE plpgsql AS $$
        BEGIN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_grievances_daily;
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_stats;
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dept_stats;
        END;
        $$
    """)

    # ── Grant read to dcos_app ────────────────────────────────────────────────
    for view in ("mv_grievances_daily", "mv_ward_stats", "mv_dept_stats"):
        op.execute(f"GRANT SELECT ON {view} TO dcos_app")
    op.execute("GRANT SELECT ON notification_preferences TO dcos_app")
    op.execute("GRANT INSERT, UPDATE ON notification_preferences TO dcos_app")


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS refresh_analytics_views()")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_dept_stats")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_ward_stats")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_grievances_daily")
    op.drop_table("notification_preferences")
