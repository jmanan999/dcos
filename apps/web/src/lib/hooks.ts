"use client";

import useSWR from "swr";
import { swrFetcher } from "./api";

// ── Analytics (CM) ────────────────────────────────────────────────────────────

export interface KPISnapshot {
  total_filed: number;
  total_open: number;
  total_resolved: number;
  total_closed: number;
  sla_breaches_active: number;
  filed_today: number;
  resolved_today: number;
  avg_resolution_hours: number | null;
  avg_csat: number | null;
}

export interface WardHotspot {
  ward_id: string;
  ward_name: string;
  district_name: string | null;
  lat: number | null;
  lng: number | null;
  open: number;
  total: number;
  sla_breaches: number;
  severity: "high" | "medium" | "low";
}

export interface DeptRow {
  department: string;
  total: number;
  resolved: number;
  open: number;
  sla_breaches: number;
  resolution_rate: number | null;
  avg_resolution_hours: number | null;
  avg_csat: number | null;
  reopen_rate: number | null;
  rank: number;
  sla_target_hours: number | null;
}

export interface TrendPoint {
  day: string;
  department: string | null;
  category: string | null;
  total: number;
  resolved: number;
  open: number;
}

const REFRESH = { refreshInterval: 30_000, revalidateOnFocus: true };

export const useKpis = () =>
  useSWR<KPISnapshot>("/analytics/kpis", swrFetcher, REFRESH);

export const useHotspots = (limit = 100) =>
  useSWR<WardHotspot[]>(`/analytics/hotspots?limit=${limit}`, swrFetcher, REFRESH);

export const useLeaderboard = () =>
  useSWR<DeptRow[]>("/analytics/leaderboard", swrFetcher, REFRESH);

export const useTrend = (days = 30) =>
  useSWR<TrendPoint[]>(`/analytics/trend?days=${days}`, swrFetcher, REFRESH);

// ── Public transparency (no auth) ─────────────────────────────────────────────

export interface PublicStats {
  total_filed: number;
  total_resolved: number;
  total_open: number;
  avg_resolution_hours: number | null;
  by_category: { category: string; count: number }[];
  by_department: { department: string; total: number; resolved: number; resolution_rate: number }[];
  hotspots: { ward_name: string; lat: number; lng: number; open_count: number; total_count: number }[];
}

export const usePublicStats = () =>
  useSWR<PublicStats>("/citizen/public-stats", swrFetcher, { refreshInterval: 60_000 });

// ── Officer ───────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  tracking_id: string;
  category: string | null;
  status: string;
  priority: string;
  severity: number | null;
  raw_text: string;
  sla_due_at: string | null;
  is_sla_breached: boolean;
  created_at: string;
}

export const useQueue = () =>
  useSWR<QueueItem[]>("/workforce/queue", swrFetcher, { refreshInterval: 20_000 });

// ── Departments (handoff / triage dropdowns) ──────────────────────────────────

export interface Department {
  id: string;
  name: string;
  short_code: string | null;
  is_active: boolean;
}

export const useDepartments = () =>
  useSWR<Department[]>("/identity/departments?active_only=true", swrFetcher, {
    refreshInterval: 0,
  });

// ── Dept / Nodal workbench ────────────────────────────────────────────────────

/** Department-wide queue (dept_admin+). Same shape as the officer queue. */
export interface DeptQueueItem {
  id: string;
  tracking_id: string;
  raw_text: string;
  category: string | null;
  subcategory: string | null;
  severity: number | null;
  status: string;
  priority: string;
  ward_id: string | null;
  latitude: number | null;
  longitude: number | null;
  sla_due_at: string | null;
  escalation_level: number;
  is_emergency: boolean;
  created_at: string;
  updated_at: string;
  hours_until_breach: number | null;
  is_sla_breached: boolean;
}

export const useDeptQueue = (deptId?: string) =>
  useSWR<DeptQueueItem[]>(
    deptId ? `/workforce/dept-queue?dept_id=${deptId}` : "/workforce/dept-queue",
    swrFetcher,
    { refreshInterval: 20_000 }
  );

export interface WorkloadRow {
  officer_id: string;
  officer_name: string | null;
  department_id: string;
  total_assigned: number;
  in_progress: number;
  sla_breached: number;
  avg_resolution_hours: number | null;
  is_available: boolean;
}

export const useWorkload = (deptId?: string) =>
  useSWR<WorkloadRow[]>(
    deptId ? `/workforce/workload?dept_id=${deptId}` : "/workforce/workload",
    swrFetcher,
    { refreshInterval: 30_000 }
  );

// ── Control-room operations analytics ─────────────────────────────────────────

export interface PendencyBucket {
  label: string;
  min_days: number;
  max_days: number | null;
  count: number;
  breached: number;
}
export interface PendencySnapshot {
  total_open: number;
  oldest_days: number | null;
  buckets: PendencyBucket[];
}
export const usePendency = (deptId?: string) =>
  useSWR<PendencySnapshot>(
    deptId ? `/analytics/pendency?dept_id=${deptId}` : "/analytics/pendency",
    swrFetcher,
    REFRESH
  );

export interface EscalationLevelRow {
  level: number;
  label: string;
  count: number;
  breached: number;
}
export interface EscalationPyramid {
  levels: EscalationLevelRow[];
  total_escalated: number;
}
export const useEscalationPyramid = () =>
  useSWR<EscalationPyramid>("/analytics/escalation-pyramid", swrFetcher, REFRESH);

export interface RepeatCluster {
  cluster_id: string;
  category: string | null;
  ward_name: string | null;
  count: number;
  open_count: number;
}
export interface CategoryBreach {
  category: string;
  total: number;
  breached: number;
  breach_rate: number;
}
export interface StaffingGap {
  department: string;
  open_load: number;
  available_officers: number;
  load_per_officer: number | null;
}
export interface RootCauseReport {
  repeat_clusters: RepeatCluster[];
  category_breaches: CategoryBreach[];
  staffing_gaps: StaffingGap[];
}
export const useRootCause = () =>
  useSWR<RootCauseReport>("/analytics/root-cause", swrFetcher, REFRESH);

export interface AuditSampleRow {
  grievance_id: string;
  tracking_id: string;
  category: string | null;
  department: string | null;
  status: string;
  resolution_hours: number | null;
  has_before_proof: boolean;
  has_after_proof: boolean;
  proof_complete: boolean;
  flagged: boolean;
  closed_at: string | null;
}
export interface AuditSample {
  sample_size: number;
  flagged_count: number;
  rows: AuditSampleRow[];
}
export const useAuditSample = (limit = 20) =>
  useSWR<AuditSample>(`/analytics/audit-sample?limit=${limit}`, swrFetcher, REFRESH);
