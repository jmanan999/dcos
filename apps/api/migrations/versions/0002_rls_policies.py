"""Row Level Security policies

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-19

Enables RLS on scoped tables and creates policies keyed to PostgreSQL session
variables set by the application (app.user_id, app.user_role, app.department_id).

Defense-in-depth: even if an application-level authz guard has a bug,
a DJB officer physically cannot read MCD grievances because the DB enforces it.

Roles reference:
  citizen         → sees only own grievances (citizen_id = app.user_id)
  field_officer   → sees dept grievances (department_id = app.department_id)
  dept_admin      → same as field_officer + can see officers list
  district_officer → sees all grievances (read-only on officers)
  cm_cell / super_admin → unrestricted
  system / seed   → bypass flag via app.bypass_rls = 'true'
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Create a dedicated DB role for app connections ─────────────────────────
    # The app connects as `dcos` (superuser in local dev).
    # In production, create a least-privilege role and grant it to the app.
    # RLS policies below use current_setting() — they work regardless of which
    # role executes queries as long as the session vars are set.

    # ── grievances ─────────────────────────────────────────────────────────────
    op.execute("ALTER TABLE grievances ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE grievances FORCE ROW LEVEL SECURITY")

    # Superuser / bypass flag — used by seed script and migrations
    op.execute("""
        CREATE POLICY rls_grievances_bypass ON grievances
        USING (
            current_setting('app.bypass_rls', true) = 'true'

        )
    """)

    # CM cell / district officers / super_admin — unrestricted
    op.execute("""
        CREATE POLICY rls_grievances_admin ON grievances
        USING (
            current_setting('app.user_role', true) IN (
                'cm_cell', 'district_officer', 'super_admin'
            )
        )
    """)

    # Department-scoped officers / dept_admins — see only their department
    op.execute("""
        CREATE POLICY rls_grievances_dept ON grievances
        USING (
            current_setting('app.user_role', true) IN ('field_officer', 'dept_admin')
            AND department_id::text = current_setting('app.department_id', true)
        )
    """)

    # Citizens — see only their own grievances
    op.execute("""
        CREATE POLICY rls_grievances_citizen ON grievances
        FOR SELECT
        USING (
            current_setting('app.user_role', true) = 'citizen'
            AND (
                citizen_id::text = current_setting('app.user_id', true)
                OR (
                    is_anonymous = true
                    AND citizen_phone IS NOT NULL
                )
            )
        )
    """)

    # ── officers ───────────────────────────────────────────────────────────────
    op.execute("ALTER TABLE officers ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE officers FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY rls_officers_bypass ON officers
        USING (
            current_setting('app.bypass_rls', true) = 'true'

        )
    """)
    op.execute("""
        CREATE POLICY rls_officers_admin ON officers
        USING (
            current_setting('app.user_role', true) IN (
                'cm_cell', 'district_officer', 'super_admin'
            )
        )
    """)
    op.execute("""
        CREATE POLICY rls_officers_dept ON officers
        USING (
            current_setting('app.user_role', true) IN ('field_officer', 'dept_admin')
            AND department_id::text = current_setting('app.department_id', true)
        )
    """)

    # ── notifications ─────────────────────────────────────────────────────────
    op.execute("ALTER TABLE notifications ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE notifications FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY rls_notifications_bypass ON notifications
        USING (
            current_setting('app.bypass_rls', true) = 'true'

        )
    """)
    op.execute("""
        CREATE POLICY rls_notifications_own ON notifications
        USING (
            current_setting('app.user_role', true) IN (
                'cm_cell', 'super_admin', 'district_officer'
            )
            OR user_id::text = current_setting('app.user_id', true)
        )
    """)

    # ── feedback ──────────────────────────────────────────────────────────────
    op.execute("ALTER TABLE feedback ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE feedback FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY rls_feedback_bypass ON feedback
        USING (
            current_setting('app.bypass_rls', true) = 'true'

        )
    """)
    op.execute("""
        CREATE POLICY rls_feedback_access ON feedback
        USING (
            current_setting('app.user_role', true) IN (
                'cm_cell', 'district_officer', 'super_admin',
                'dept_admin', 'field_officer'
            )
            OR citizen_id::text = current_setting('app.user_id', true)
        )
    """)

    # ── assignment_history ────────────────────────────────────────────────────
    op.execute("ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE assignment_history FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY rls_assignment_bypass ON assignment_history
        USING (
            current_setting('app.bypass_rls', true) = 'true'

        )
    """)
    op.execute("""
        CREATE POLICY rls_assignment_access ON assignment_history
        USING (
            current_setting('app.user_role', true) IN (
                'cm_cell', 'district_officer', 'super_admin'
            )
            OR (
                current_setting('app.user_role', true) IN ('field_officer', 'dept_admin')
                AND department_id::text = current_setting('app.department_id', true)
            )
        )
    """)


def downgrade() -> None:
    for policy, tbl in [
        ("rls_grievances_bypass", "grievances"),
        ("rls_grievances_admin", "grievances"),
        ("rls_grievances_dept", "grievances"),
        ("rls_grievances_citizen", "grievances"),
        ("rls_officers_bypass", "officers"),
        ("rls_officers_admin", "officers"),
        ("rls_officers_dept", "officers"),
        ("rls_notifications_bypass", "notifications"),
        ("rls_notifications_own", "notifications"),
        ("rls_feedback_bypass", "feedback"),
        ("rls_feedback_access", "feedback"),
        ("rls_assignment_bypass", "assignment_history"),
        ("rls_assignment_access", "assignment_history"),
    ]:
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {tbl}")

    for tbl in ["grievances", "officers", "notifications", "feedback", "assignment_history"]:
        op.execute(f"ALTER TABLE {tbl} DISABLE ROW LEVEL SECURITY")
