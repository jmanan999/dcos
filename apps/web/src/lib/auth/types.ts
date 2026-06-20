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

/** Where each role lands after login. */
export function homeForRole(role: Role): string {
  switch (role) {
    case "citizen":
      return "/file";
    case "field_officer":
    case "dept_admin":
      return "/officer";
    case "district_officer":
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

export function isCommandRole(role: Role): boolean {
  return ["district_officer", "cm_cell", "super_admin"].includes(role);
}
