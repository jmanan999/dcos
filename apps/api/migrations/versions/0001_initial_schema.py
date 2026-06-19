"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-19

Creates the full DCOS schema:
  - Extensions: postgis, vector, pg_trgm, uuid-ossp, btree_gin
  - Enum types: grievance_status, channel, priority, attachment_type, proof_type
  - Tables (in FK dependency order): districts, zones, assembly_constituencies, wards,
    departments, users, officers, sla_policies, grievance_clusters, grievances,
    status_events, attachments, assignment_history, feedback, notifications,
    outbox_events, audit_log, idempotency_keys
  - Indexes: btree composites, GiST spatial, HNSW vector, GIN trigram
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID, ARRAY

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Extensions ────────────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology")
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gin")

    # ── Enum types ────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TYPE grievance_status AS ENUM (
            'RECEIVED', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS',
            'ACTION_TAKEN', 'RESOLVED', 'VERIFIED', 'REOPENED',
            'CLOSED', 'REJECTED_SPAM', 'ESCALATED'
        )
    """)
    op.execute("""
        CREATE TYPE channel_type AS ENUM (
            'web', 'whatsapp', 'ivr', 'api', 'walk_in'
        )
    """)
    op.execute("""
        CREATE TYPE priority_level AS ENUM (
            'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
        )
    """)

    # ── Reference / geo tables ────────────────────────────────────────────────
    op.create_table(
        "districts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("code", sa.String(10), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "zones",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("code", sa.String(10), nullable=False, unique=True),
        sa.Column("district_id", UUID(as_uuid=True), sa.ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "assembly_constituencies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("number", sa.Integer, nullable=False, unique=True),
        sa.Column("district_id", UUID(as_uuid=True), sa.ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "wards",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("number", sa.Integer, nullable=False, unique=True),
        sa.Column("zone_id", UUID(as_uuid=True), sa.ForeignKey("zones.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("district_id", UUID(as_uuid=True), sa.ForeignKey("districts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("centroid_lat", sa.Float, nullable=True),
        sa.Column("centroid_lng", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    # PostGIS geometry column for ward polygons (GiST indexed)
    op.execute("""
        ALTER TABLE wards
        ADD COLUMN geometry geography(MULTIPOLYGON, 4326)
    """)
    op.execute("CREATE INDEX ix_wards_geometry ON wards USING gist (geometry)")
    op.create_index("ix_wards_zone_id", "wards", ["zone_id"])
    op.create_index("ix_wards_district_id", "wards", ["district_id"])

    # ── Identity tables ───────────────────────────────────────────────────────
    op.create_table(
        "departments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("short_code", sa.String(20), nullable=False, unique=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("parent_dept_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("escalation_email", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_departments_short_code", "departments", ["short_code"])

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("phone", sa.String(20), nullable=True, unique=True),
        sa.Column("email", sa.String(255), nullable=True, unique=True),
        sa.Column("name", sa.String(200), nullable=True),
        sa.Column("role", sa.String(40), nullable=False, server_default="citizen"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("language_pref", sa.String(10), nullable=False, server_default="hi"),
        sa.Column("auth_uid", sa.String(80), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_phone", "users", ["phone"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "officers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("designation", sa.String(200), nullable=True),
        sa.Column("employee_id", sa.String(40), nullable=True, unique=True),
        sa.Column("ward_ids", ARRAY(UUID(as_uuid=True)), nullable=True),
        sa.Column("max_active_cases", sa.Integer, nullable=False, server_default="50"),
        sa.Column("is_available", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_officers_user_id", "officers", ["user_id"])
    op.create_index("ix_officers_department_id", "officers", ["department_id"])

    # ── SLA policies ─────────────────────────────────────────────────────────
    op.create_table(
        "sla_policies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="CASCADE"), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("priority", sa.String(10), nullable=True),
        sa.Column("resolution_hours", sa.Integer, nullable=False),
        sa.Column("first_escalation_hours", sa.Integer, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_sla_policies_dept_category", "sla_policies", ["department_id", "category"])

    # ── Grievance clusters (before grievances due to self-ref FK) ─────────────
    op.create_table(
        "grievance_clusters",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("subcategory", sa.String(100), nullable=True),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ward_id", UUID(as_uuid=True), sa.ForeignKey("wards.id", ondelete="SET NULL"), nullable=True),
        sa.Column("master_grievance_id", UUID(as_uuid=True), nullable=True),
        sa.Column("count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("centroid_lat", sa.Float, nullable=True),
        sa.Column("centroid_lng", sa.Float, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_clusters_dept_category", "grievance_clusters", ["department_id", "category"])

    # ── Grievances ────────────────────────────────────────────────────────────
    op.create_table(
        "grievances",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("tracking_id", sa.String(30), nullable=False, unique=True),
        sa.Column("citizen_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("citizen_phone", sa.String(20), nullable=True),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("raw_text", sa.Text, nullable=False),
        sa.Column("language", sa.String(10), nullable=False, server_default="hi"),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("subcategory", sa.String(100), nullable=True),
        sa.Column("severity", sa.Integer, nullable=True),
        sa.Column("ai_confidence", sa.Float, nullable=True),
        sa.Column("spam_score", sa.Float, nullable=True),
        sa.Column("sentiment_score", sa.Float, nullable=True),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_officer_id", UUID(as_uuid=True), sa.ForeignKey("officers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="RECEIVED"),
        sa.Column("priority", sa.String(10), nullable=False, server_default="MEDIUM"),
        sa.Column("ward_id", UUID(as_uuid=True), sa.ForeignKey("wards.id", ondelete="SET NULL"), nullable=True),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        sa.Column("cluster_id", UUID(as_uuid=True), sa.ForeignKey("grievance_clusters.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sla_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("escalation_level", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_emergency", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_anonymous", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("channel_meta", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # PostGIS point column for grievance location (GiST indexed)
    op.execute("ALTER TABLE grievances ADD COLUMN location geography(POINT, 4326)")
    op.execute("CREATE INDEX ix_grievances_location ON grievances USING gist (location)")

    # pgvector 768-dim embedding (HNSW indexed with cosine distance)
    op.execute("ALTER TABLE grievances ADD COLUMN embedding vector(768)")
    op.execute("""
        CREATE INDEX ix_grievances_embedding ON grievances
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # GIN trigram full-text search on raw_text
    op.execute("""
        CREATE INDEX ix_grievances_raw_text_trgm ON grievances
        USING gin (raw_text gin_trgm_ops)
    """)

    # Btree composite indexes
    op.create_index("ix_grievances_tracking_id", "grievances", ["tracking_id"], unique=True)
    op.create_index("ix_grievances_dept_status_sla", "grievances", ["department_id", "status", "sla_due_at"])
    op.create_index("ix_grievances_ward_status", "grievances", ["ward_id", "status"])
    op.create_index("ix_grievances_citizen_id", "grievances", ["citizen_id"])
    op.create_index("ix_grievances_cluster_id", "grievances", ["cluster_id"])
    op.create_index("ix_grievances_created_at", "grievances", ["created_at"])

    # Trigger: auto-set location from lat/lng on INSERT/UPDATE
    op.execute("""
        CREATE OR REPLACE FUNCTION sync_grievance_location()
        RETURNS trigger AS $$
        BEGIN
            IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
                NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)
    op.execute("""
        CREATE TRIGGER trg_sync_grievance_location
        BEFORE INSERT OR UPDATE OF latitude, longitude ON grievances
        FOR EACH ROW EXECUTE FUNCTION sync_grievance_location()
    """)

    # ── Status events (append-only) ────────────────────────────────────────────
    op.create_table(
        "status_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("grievance_id", UUID(as_uuid=True), sa.ForeignKey("grievances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", sa.String(20), nullable=True),
        sa.Column("to_status", sa.String(20), nullable=False),
        sa.Column("actor_id", sa.String(80), nullable=True),
        sa.Column("actor_role", sa.String(40), nullable=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_status_events_grievance_id", "status_events", ["grievance_id"])
    op.create_index("ix_status_events_ts", "status_events", ["ts"])

    # ── Attachments ───────────────────────────────────────────────────────────
    op.create_table(
        "attachments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("grievance_id", UUID(as_uuid=True), sa.ForeignKey("grievances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=True),
        sa.Column("exif_lat", sa.Float, nullable=True),
        sa.Column("exif_lng", sa.Float, nullable=True),
        sa.Column("is_proof", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("proof_type", sa.String(10), nullable=True),
        sa.Column("uploaded_by_id", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_attachments_grievance_id", "attachments", ["grievance_id"])
    op.create_index("ix_attachments_is_proof", "attachments", ["is_proof"])

    # ── Assignment history ────────────────────────────────────────────────────
    op.create_table(
        "assignment_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("grievance_id", UUID(as_uuid=True), sa.ForeignKey("grievances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("officer_id", UUID(as_uuid=True), sa.ForeignKey("officers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("department_id", UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_by_id", sa.String(80), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("unassigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.Text, nullable=True),
    )
    op.create_index("ix_assignment_grievance_id", "assignment_history", ["grievance_id"])
    op.create_index("ix_assignment_officer_id", "assignment_history", ["officer_id"])

    # ── Feedback ──────────────────────────────────────────────────────────────
    op.create_table(
        "feedback",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("grievance_id", UUID(as_uuid=True), sa.ForeignKey("grievances.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("citizen_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("is_reopen_request", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_feedback_grievance_id", "feedback", ["grievance_id"])

    # ── Notifications ─────────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("grievance_id", UUID(as_uuid=True), sa.ForeignKey("grievances.id", ondelete="CASCADE"), nullable=True),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("external_id", sa.String(120), nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_grievance_id", "notifications", ["grievance_id"])
    op.create_index("ix_notifications_status", "notifications", ["status"])

    # ── Escalation records ────────────────────────────────────────────────────
    op.create_table(
        "escalation_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("grievance_id", UUID(as_uuid=True), sa.ForeignKey("grievances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("level", sa.Integer, nullable=False),
        sa.Column("escalated_to_id", sa.String(80), nullable=True),
        sa.Column("escalated_to_role", sa.String(40), nullable=True),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_escalation_grievance_id", "escalation_records", ["grievance_id"])

    # ── Platform: outbox, audit, idempotency ──────────────────────────────────
    op.create_table(
        "outbox_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("aggregate_type", sa.String(80), nullable=False),
        sa.Column("aggregate_id", sa.String(80), nullable=False),
        sa.Column("payload", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_outbox_unprocessed", "outbox_events", ["created_at"])

    op.create_table(
        "audit_log",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("actor_id", sa.String(80), nullable=True),
        sa.Column("actor_role", sa.String(40), nullable=True),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("resource_type", sa.String(80), nullable=False),
        sa.Column("resource_id", sa.String(80), nullable=True),
        sa.Column("old_value", JSONB, nullable=True),
        sa.Column("new_value", JSONB, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("request_id", sa.String(36), nullable=True),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_audit_actor", "audit_log", ["actor_id"])
    op.create_index("ix_audit_resource", "audit_log", ["resource_type", "resource_id"])
    op.create_index("ix_audit_ts", "audit_log", ["ts"])

    op.create_table(
        "idempotency_keys",
        sa.Column("key", sa.String(255), primary_key=True),
        sa.Column("response_status", sa.Integer, nullable=False),
        sa.Column("response_body", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    # Tables (reverse order)
    for tbl in [
        "idempotency_keys", "audit_log", "outbox_events",
        "escalation_records", "notifications", "feedback",
        "assignment_history", "attachments", "status_events",
        "grievances", "grievance_clusters", "sla_policies",
        "officers", "users", "departments",
        "wards", "assembly_constituencies", "zones", "districts",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE")

    op.execute("DROP TYPE IF EXISTS grievance_status CASCADE")
    op.execute("DROP TYPE IF EXISTS channel_type CASCADE")
    op.execute("DROP TYPE IF EXISTS priority_level CASCADE")
    op.execute("DROP FUNCTION IF EXISTS sync_grievance_location() CASCADE")
