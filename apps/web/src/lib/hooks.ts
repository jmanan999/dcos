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

// ── Epic 2: Field Operations Intelligence ─────────────────────────────────────

export interface RouteStop {
  id: string;
  tracking_id: string;
  category: string | null;
  latitude: number;
  longitude: number;
  is_sla_breached: boolean;
  priority: string;
}
export interface RouteCluster {
  label: string;
  ward_name: string | null;
  stops: RouteStop[];
  estimated_minutes: number;
  google_maps_url: string;
}
export interface RoutePlan {
  clusters: RouteCluster[];
  total_stops: number;
  unclustered: number;
  naive_minutes: number;
  optimised_minutes: number;
  minutes_saved: number;
}
export const useRoutePlan = () =>
  useSWR<RoutePlan>("/workforce/route-plan", swrFetcher, { refreshInterval: 60_000 });

export interface OfficerScorecard {
  officer_id: string;
  officer_name: string | null;
  open_cases: number;
  resolved_7d: number;
  resolved_30d: number;
  avg_resolution_hours: number | null;
  sla_breaches: number;
  false_closure_rate: number;
  avg_csat: number | null;
  dept_rank: number;
  dept_total_officers: number;
  performance_grade: string;
}
export const useMyScorecard = () =>
  useSWR<OfficerScorecard>("/workforce/my-scorecard", swrFetcher, { refreshInterval: 60_000 });

export interface ChecklistStep {
  id: string;
  step_order: number;
  step_label: string;
  step_label_hi: string | null;
  requires_photo: boolean;
  completed: boolean;
  completed_note: string | null;
}
export interface ChecklistStatus {
  category: string;
  steps: ChecklistStep[];
  total: number;
  completed: number;
  all_complete: boolean;
}

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

// ── Intelligence Layer (Governance OS) ────────────────────────────────────────

export interface EconomicDragItem {
  category: string;
  open_count: number;
  avg_days_open: number;
  daily_cost_per_complaint: number;
  total_daily_drag: number;
  total_monthly_projection: number;
}
export interface EconomicDragReport {
  total_daily_drag_inr: number;
  total_monthly_projection_inr: number;
  total_annual_projection_inr: number;
  trend_vs_last_week_pct: number;
  by_category: EconomicDragItem[];
  top_drain_category: string;
  top_drain_daily_inr: number;
}
export const useEconomicDrag = () =>
  useSWR<EconomicDragReport>("/analytics/economic-drag", swrFetcher, REFRESH);

export interface WardIntelligence {
  ward_name: string;
  district_name: string | null;
  wpi: number;
  wpi_grade: string;
  wpi_rank: number;
  total_complaints: number;
  open_complaints: number;
  resolution_rate: number;
  sla_compliance_rate: number;
  avg_resolution_hours: number;
  reopen_rate: number;
  economic_drag_daily_inr: number;
  wpi_change_30d: number;
}
export interface WardIndexReport {
  wards: WardIntelligence[];
  city_avg_wpi: number;
  total_wards_ranked: number;
  top_5: string[];
  bottom_5: string[];
  total_economic_drag_daily: number;
  wards_in_crisis: number;
}
export const useWardIndex = () =>
  useSWR<WardIndexReport>("/analytics/ward-index", swrFetcher, { ...REFRESH, refreshInterval: 300_000 });

export interface PredictiveAlert {
  ward_name: string;
  district_name: string | null;
  alert_type: string;
  category: string;
  predicted_spike_pct: number;
  confidence_pct: number;
  days_until_peak: number;
  estimated_complaints: number;
  economic_impact_if_ignored_lakh: number;
  recommended_action: string;
  urgency: string;
}
export interface PredictiveReport {
  alerts: PredictiveAlert[];
  total_wards_at_risk: number;
  highest_risk_category: string;
  total_economic_risk_lakh: number;
  monsoon_risk_score: number;
  pre_emptive_budget_recommendation_lakh: number;
}
export const usePredictions = () =>
  useSWR<PredictiveReport>("/analytics/predictions", swrFetcher, REFRESH);

export interface GovernanceScorecard {
  date: string;
  city_health_score: number;
  city_health_grade: string;
  daily_economic_drag_inr: number;
  daily_economic_drag_vs_last_week_pct: number;
  top_5_economic_drains: { category: string; daily_inr: number }[];
  top_5_worst_wards: { ward: string; wpi: number; district: string | null }[];
  top_5_contractor_risks: { dept: string; waste_lakh: number }[];
  top_5_predictive_alerts: { ward: string; category: string; spike_pct: number; impact_lakh: number }[];
  wpi_improving_wards: number;
  wpi_declining_wards: number;
  complaints_filed_7d: number;
  complaints_resolved_7d: number;
  resolution_rate_7d: number;
  chief_secretary_action_items: string[];
}
export const useGovernanceScorecard = () =>
  useSWR<GovernanceScorecard>("/analytics/governance-scorecard", swrFetcher, REFRESH);
