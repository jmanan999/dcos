// ── Roles ─────────────────────────────────────────────────────────────────────
export type Role =
  | "citizen"
  | "field_officer"
  | "dept_admin"
  | "district_officer"
  | "cm_cell"
  | "super_admin";

// ── Grievance ─────────────────────────────────────────────────────────────────
export type GrievanceStatus =
  | "RECEIVED"
  | "CLASSIFIED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "ACTION_TAKEN"
  | "RESOLVED"
  | "VERIFIED"
  | "REOPENED"
  | "CLOSED"
  | "REJECTED_SPAM"
  | "ESCALATED";

export type Channel = "web" | "whatsapp" | "ivr" | "api" | "walk_in";

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface GrievanceRead {
  id: string;
  tracking_id: string;
  channel: Channel;
  raw_text: string;
  language: string;
  category: string;
  subcategory?: string;
  department_id: string;
  severity: number;
  status: GrievanceStatus;
  priority: Priority;
  ward_id?: string;
  location?: { lat: number; lng: number };
  cluster_id?: string;
  sla_due_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GrievanceCreate {
  raw_text: string;
  channel: Channel;
  location?: { lat: number; lng: number };
  language?: string;
  idempotency_key: string;
}

// ── Status event (append-only audit) ─────────────────────────────────────────
export interface StatusEvent {
  id: string;
  grievance_id: string;
  from_status: GrievanceStatus | null;
  to_status: GrievanceStatus;
  actor_id: string;
  note?: string;
  ts: string;
}

// ── Department ────────────────────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  short_code: string;
  jurisdiction_wards?: string[];
}

// ── Officer ───────────────────────────────────────────────────────────────────
export interface Officer {
  id: string;
  name: string;
  role: Role;
  department_id: string;
  ward_ids?: string[];
}

// ── Feedback (CSAT) ───────────────────────────────────────────────────────────
export interface Feedback {
  grievance_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  created_at: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface KPISnapshot {
  total_filed: number;
  total_open: number;
  total_resolved: number;
  sla_breaches: number;
  avg_resolution_hours: number;
  as_of: string;
}

export interface HotspotResult {
  ward_id: string;
  ward_name: string;
  count: number;
  delta_pct: number;
  top_category: string;
}
