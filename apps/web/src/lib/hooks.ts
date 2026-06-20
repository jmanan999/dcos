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
