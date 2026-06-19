"""
DCOS permission matrix.

A `Permission` string follows the pattern:  "<resource>:<action>"
e.g. "grievance:read_any", "officer:manage", "analytics:view_cm"

Each role is granted a frozenset of permissions.  The `require_permission`
FastAPI dependency reads this at request time — no DB round-trip needed.
"""
from __future__ import annotations

# ── Permission constants ──────────────────────────────────────────────────────

class P:
    # Grievances
    GRIEVANCE_FILE       = "grievance:file"
    GRIEVANCE_READ_OWN   = "grievance:read_own"
    GRIEVANCE_READ_DEPT  = "grievance:read_dept"
    GRIEVANCE_READ_ANY   = "grievance:read_any"
    GRIEVANCE_ASSIGN     = "grievance:assign"
    GRIEVANCE_RESOLVE    = "grievance:resolve"
    GRIEVANCE_CLOSE      = "grievance:close"
    GRIEVANCE_REOPEN     = "grievance:reopen"
    GRIEVANCE_ESCALATE   = "grievance:escalate"

    # Officers / workforce
    OFFICER_READ_DEPT    = "officer:read_dept"
    OFFICER_READ_ANY     = "officer:read_any"
    OFFICER_MANAGE_DEPT  = "officer:manage_dept"
    OFFICER_MANAGE_ANY   = "officer:manage_any"

    # Departments
    DEPARTMENT_READ      = "department:read"
    DEPARTMENT_MANAGE    = "department:manage"

    # Analytics
    ANALYTICS_VIEW_DEPT  = "analytics:view_dept"
    ANALYTICS_VIEW_ANY   = "analytics:view_any"
    ANALYTICS_NL_QUERY   = "analytics:nl_query"

    # Reports
    REPORT_GENERATE      = "report:generate"

    # Admin
    AUDIT_READ           = "audit:read"
    SYSTEM_CONFIG        = "system:config"


# ── Role → permission matrix ──────────────────────────────────────────────────

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "citizen": frozenset({
        P.GRIEVANCE_FILE,
        P.GRIEVANCE_READ_OWN,
        P.GRIEVANCE_REOPEN,
        P.DEPARTMENT_READ,
    }),

    "field_officer": frozenset({
        P.GRIEVANCE_READ_DEPT,
        P.GRIEVANCE_RESOLVE,
        P.GRIEVANCE_CLOSE,
        P.GRIEVANCE_ESCALATE,
        P.OFFICER_READ_DEPT,
        P.DEPARTMENT_READ,
        P.ANALYTICS_VIEW_DEPT,
    }),

    "dept_admin": frozenset({
        P.GRIEVANCE_READ_DEPT,
        P.GRIEVANCE_ASSIGN,
        P.GRIEVANCE_RESOLVE,
        P.GRIEVANCE_CLOSE,
        P.GRIEVANCE_ESCALATE,
        P.OFFICER_READ_DEPT,
        P.OFFICER_MANAGE_DEPT,
        P.DEPARTMENT_READ,
        P.ANALYTICS_VIEW_DEPT,
        P.REPORT_GENERATE,
    }),

    "district_officer": frozenset({
        P.GRIEVANCE_READ_ANY,
        P.GRIEVANCE_ASSIGN,
        P.GRIEVANCE_ESCALATE,
        P.OFFICER_READ_ANY,
        P.DEPARTMENT_READ,
        P.ANALYTICS_VIEW_ANY,
        P.REPORT_GENERATE,
        P.AUDIT_READ,
    }),

    "cm_cell": frozenset({
        P.GRIEVANCE_READ_ANY,
        P.GRIEVANCE_ASSIGN,
        P.GRIEVANCE_ESCALATE,
        P.OFFICER_READ_ANY,
        P.OFFICER_MANAGE_ANY,
        P.DEPARTMENT_READ,
        P.DEPARTMENT_MANAGE,
        P.ANALYTICS_VIEW_ANY,
        P.ANALYTICS_NL_QUERY,
        P.REPORT_GENERATE,
        P.AUDIT_READ,
    }),

    "super_admin": frozenset({
        # Every permission that exists — super_admin is unrestricted
        P.GRIEVANCE_FILE,
        P.GRIEVANCE_READ_OWN,
        P.GRIEVANCE_READ_DEPT,
        P.GRIEVANCE_READ_ANY,
        P.GRIEVANCE_ASSIGN,
        P.GRIEVANCE_RESOLVE,
        P.GRIEVANCE_CLOSE,
        P.GRIEVANCE_REOPEN,
        P.GRIEVANCE_ESCALATE,
        P.OFFICER_READ_DEPT,
        P.OFFICER_READ_ANY,
        P.OFFICER_MANAGE_DEPT,
        P.OFFICER_MANAGE_ANY,
        P.DEPARTMENT_READ,
        P.DEPARTMENT_MANAGE,
        P.ANALYTICS_VIEW_DEPT,
        P.ANALYTICS_VIEW_ANY,
        P.ANALYTICS_NL_QUERY,
        P.REPORT_GENERATE,
        P.AUDIT_READ,
        P.SYSTEM_CONFIG,
    }),
}


def has_permission(role: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, frozenset())


def get_permissions(role: str) -> frozenset[str]:
    return ROLE_PERMISSIONS.get(role, frozenset())
