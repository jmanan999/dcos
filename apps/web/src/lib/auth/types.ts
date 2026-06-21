export type Role =
  | "citizen"
  | "field_officer"
  | "dept_admin"
  | "district_officer"
  | "cm_cell"
  | "super_admin";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  department_id?: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  citizen: "Citizen",
  field_officer: "Field Officer",
  dept_admin: "Department Admin",
  district_officer: "District Officer",
  cm_cell: "CM Cell",
  super_admin: "Super Admin",
};

/**
 * Where each role lands after login — the 3-tier government hierarchy:
 *   field_officer            → /officer  (My Work)
 *   dept_admin, district     → /dept     (Department Workbench)
 *   cm_cell, super_admin     → /cm       (State Grievance Control Room)
 */
export function homeForRole(role: Role): string {
  switch (role) {
    case "citizen":
      return "/file";
    case "field_officer":
      return "/officer";
    case "dept_admin":
    case "district_officer":
      return "/dept";
    case "cm_cell":
    case "super_admin":
      return "/cm";
    default:
      return "/";
  }
}

export function isOfficerRole(role: Role): boolean {
  return ["field_officer", "dept_admin", "district_officer", "super_admin"].includes(role);
}

/** Nodal / department tier — can assign, reassign, supervise a team. */
export function isDeptRole(role: Role): boolean {
  return ["dept_admin", "district_officer", "cm_cell", "super_admin"].includes(role);
}

export function isCommandRole(role: Role): boolean {
  return ["cm_cell", "super_admin"].includes(role);
}
