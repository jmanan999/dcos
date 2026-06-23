"""Enable RLS on all remaining public-schema tables

Fixes Supabase database linter errors: 28 tables without RLS enabled.

Two policies applied:
  1. Reference / geography tables → ENABLE RLS + public SELECT allowed
     (wards, districts, zones, assembly_constituencies, departments,
      sla_policies, complaint_checklists, ward_representatives,
      ward_wpi_history, feedback_labels, spatial_ref_sys)

  2. Internal / sensitive tables → ENABLE RLS only
     (service role bypasses RLS automatically; no anon/citizen access)
     (users, grievance_clusters, attachments, status_events,
      escalation_records, outbox_events, audit_log, idempotency_keys,
      ai_results, officer_notes, notification_preferences,
      checklist_completions, contracts, contractor_performance,
      budget_allocations, officer_burnout_scores, alembic_version)

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-23
"""

from __future__ import annotations

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None

# ── Tables that are pure reference / public data ─────────────────────────────
# Citizens and anonymous users legitimately need to read these.
PUBLIC_READ_TABLES = [
    "districts",
    "zones",
    "assembly_constituencies",
    "wards",
    "departments",
    "sla_policies",
    "complaint_checklists",
    "ward_representatives",
    "ward_wpi_history",
    "feedback_labels",
    # spatial_ref_sys is a PostGIS extension table — owned by supabase_admin, skip
]

# ── Tables that are internal / sensitive ─────────────────────────────────────
# Service role (used by the FastAPI app) bypasses RLS automatically.
# No anon/authenticated policy means PostgREST public access is blocked.
INTERNAL_TABLES = [
    "alembic_version",
    "users",
    "grievance_clusters",
    "attachments",
    "status_events",
    "escalation_records",
    "outbox_events",
    "audit_log",
    "idempotency_keys",
    "ai_results",
    "officer_notes",
    "notification_preferences",
    "checklist_completions",
    "contracts",
    "contractor_performance",
    "budget_allocations",
    "officer_burnout_scores",
]


def upgrade() -> None:
    # Reference tables: enable RLS + allow public read
    for table in PUBLIC_READ_TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
        op.execute(f"""
            CREATE POLICY "public_read_{table}"
            ON public."{table}"
            FOR SELECT
            USING (true)
        """)

    # Internal tables: enable RLS only (service role bypasses; PostgREST blocked)
    for table in INTERNAL_TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    for table in PUBLIC_READ_TABLES:
        op.execute(f'DROP POLICY IF EXISTS "public_read_{table}" ON public."{table}"')
        op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')

    for table in INTERNAL_TABLES:
        op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')
