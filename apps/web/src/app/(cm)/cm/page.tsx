"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  Flame,
  ArrowRight,
  RefreshCw,
  Radio,
  ShieldAlert,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  cn,
} from "@dcos/ui";
import { GisMap } from "@/components/GisMap";
import { useKpis, useHotspots, useLeaderboard, useTrend } from "@/lib/hooks";
import { swrFetcher } from "@/lib/api";
import useSWR from "swr";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RiskIndex {
  level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  score: number;
  factors: { label: string; value: string; severity: string }[];
  summary: string;
}

interface CitizenJourney {
  tracking_id: string;
  category: string | null;
  department: string | null;
  channel: string;
  steps: { timestamp: string; event: string; detail: string; status: string }[];
  is_resolved: boolean;
  resolution_hours: number | null;
}

interface ExecutiveBrief {
  headline: string;
  sections: { title: string; body: string }[];
  top_wards_by_open: string[];
  top_departments_by_backlog: string[];
}

// ── Risk level config ─────────────────────────────────────────────────────────

const RISK_CONFIG = {
  CRITICAL: { bg: "bg-red-950/50", border: "border-red-500/50", text: "text-red-400", pulse: "bg-red-500", label: "🚨 CRITICAL" },
  HIGH:     { bg: "bg-orange-950/40", border: "border-orange-500/50", text: "text-orange-400", pulse: "bg-orange-500", label: "⚠ HIGH RISK" },
  MEDIUM:   { bg: "bg-amber-950/30", border: "border-amber-500/40", text: "text-amber-400", pulse: "bg-amber-500", label: "⚡ MEDIUM" },
  LOW:      { bg: "bg-emerald-950/30", border: "border-emerald-500/40", text: "text-emerald-400", pulse: "bg-emerald-500", label: "✓ STABLE" },
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

function LivePulse({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.LOW;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", cfg.pulse)} />
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", cfg.pulse)} />
    </span>
  );
}

function StatTile({ label, value, sub, accent = "default" }: { label: string; value: React.ReactNode; sub?: string; accent?: "default" | "danger" | "warn" | "success" }) {
  const colors = {
    default: "text-slate-200",
    danger:  "text-red-400",
    warn:    "text-amber-400",
    success: "text-emerald-400",
  };
  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar/50 p-4">
      <p className="text-2xs font-medium uppercase tracking-widest text-sidebar-muted">{label}</p>
      <p className={cn("mt-1.5 text-3xl font-bold tabular-nums", colors[accent])}>{value}</p>
      {sub && <p className="mt-0.5 text-2xs text-sidebar-muted">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CommandCenter() {
  const { data: kpis } = useKpis();
  const { data: hotspots, isLoading: hotspotsLoading } = useHotspots(200);
  const { data: leaderboard } = useLeaderboard();
  const { data: trend } = useTrend(14);
  const { data: risk } = useSWR<RiskIndex>("/analytics/risk-index", swrFetcher, { refreshInterval: 30_000 });
  const { data: journey } = useSWR<CitizenJourney | null>("/analytics/citizen-journey", swrFetcher, { refreshInterval: 60_000 });
  const { data: brief } = useSWR<ExecutiveBrief>("/analytics/executive-brief", swrFetcher, { refreshInterval: 300_000 });

  const [lastRefresh, setLastRefresh] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setLastRefresh(new Date()), 30000); return () => clearInterval(t); }, []);

  const riskCfg = RISK_CONFIG[risk?.level ?? "LOW"];

  // Trend aggregated by day
  const trendByDay = (() => {
    if (!trend) return [];
    const m = new Map<string, number>();
    for (const t of trend) {
      const d = new Date(t.day).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      m.set(d, (m.get(d) ?? 0) + t.total);
    }
    return Array.from(m.entries()).map(([day, total]) => ({ day, total }));
  })();

  // Top crisis wards
  const crisisWards = (hotspots ?? []).filter(h => h.severity === "high").slice(0, 5);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-0 overflow-hidden">

      {/* ── TOPBAR: Delhi Command Center branding + risk ──────────────────── */}
      <div className={cn("shrink-0 border-b px-6 py-3 transition-colors", riskCfg.border, riskCfg.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LivePulse level={risk?.level ?? "LOW"} />
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">
                DELHI COMMAND CENTER
              </h1>
              <p className="text-2xs text-sidebar-muted">
                Live grievance intelligence · updated {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Delhi Risk Index — the big number */}
            <div className={cn("flex items-center gap-2 rounded-lg border px-4 py-2", riskCfg.border, riskCfg.bg)}>
              <ShieldAlert className={cn("h-5 w-5", riskCfg.text)} />
              <div>
                <p className="text-2xs text-sidebar-muted">DELHI RISK INDEX</p>
                <p className={cn("text-lg font-black tracking-widest", riskCfg.text)}>
                  {risk?.level ?? "—"}
                </p>
              </div>
              {risk?.score !== undefined && (
                <p className={cn("ml-1 text-3xl font-black tabular-nums", riskCfg.text)}>
                  {risk.score}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Open" value={kpis?.total_open?.toLocaleString("en-IN") ?? "—"} accent="warn" />
              <StatTile label="SLA↑" value={kpis?.sla_breaches_active ?? "—"} accent="danger" />
              <StatTile label="Today" value={kpis?.filed_today ?? "—"} />
            </div>
          </div>
        </div>

        {/* Executive brief strip */}
        {brief?.headline && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
            <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sidebar-accent" />
            <p className="text-xs text-sidebar-foreground line-clamp-1">
              <span className="font-semibold text-white">AI Chief Secretary: </span>
              {brief.sections[0]?.body ?? brief.headline}
            </p>
            <Link href="/cm/reports" className="ml-auto shrink-0 text-2xs text-sidebar-accent hover:underline">
              Full brief →
            </Link>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-0">

        {/* LEFT: Crisis alerts + dept leaderboard */}
        <div className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/30 overflow-y-auto scrollbar-thin">

          {/* Crisis alerts */}
          <div className="border-b border-sidebar-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Flame className="h-3.5 w-3.5 text-red-400" />
              <p className="text-2xs font-bold uppercase tracking-wider text-sidebar-muted">Crisis Wards</p>
            </div>
            {crisisWards.length === 0 ? (
              <p className="text-2xs text-sidebar-muted italic">No critical wards</p>
            ) : (
              <div className="space-y-1.5">
                {crisisWards.map(w => (
                  <div key={w.ward_id} className="rounded-md bg-red-950/40 border border-red-500/20 px-2 py-1.5">
                    <p className="text-xs font-medium text-red-300 truncate">{w.ward_name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-2xs text-red-400/70">{w.district_name ?? "—"}</p>
                      <span className="text-2xs font-bold text-red-400">{w.open} open</span>
                    </div>
                    {w.sla_breaches > 0 && (
                      <p className="text-2xs text-red-500 mt-0.5">⚠ {w.sla_breaches} SLA breach{w.sla_breaches > 1 ? "es" : ""}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risk factors */}
          {risk?.factors && (
            <div className="border-b border-sidebar-border p-3">
              <p className="text-2xs font-bold uppercase tracking-wider text-sidebar-muted mb-2">Risk Factors</p>
              <div className="space-y-1.5">
                {risk.factors.map(f => {
                  const c = f.severity === "critical" ? "text-red-400" : f.severity === "high" ? "text-orange-400" : f.severity === "medium" ? "text-amber-400" : "text-emerald-400";
                  return (
                    <div key={f.label} className="flex items-center justify-between">
                      <p className="text-2xs text-sidebar-muted truncate">{f.label}</p>
                      <p className={cn("text-2xs font-bold", c)}>{f.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dept leaderboard mini */}
          <div className="flex-1 p-3">
            <p className="text-2xs font-bold uppercase tracking-wider text-sidebar-muted mb-2">Dept Performance</p>
            {leaderboard ? (
              <div className="space-y-1">
                {leaderboard.slice(0, 8).map(d => (
                  <div key={d.department} className="flex items-center justify-between">
                    <p className="text-2xs text-sidebar-foreground truncate flex-1 mr-2">{d.department.replace("Delhi ", "").replace(" Limited", "")}</p>
                    <span className={cn("text-2xs font-bold shrink-0",
                      d.resolution_rate != null && d.resolution_rate >= 60 ? "text-emerald-400" :
                      d.resolution_rate != null && d.resolution_rate >= 40 ? "text-amber-400" : "text-red-400"
                    )}>{d.resolution_rate != null ? `${d.resolution_rate}%` : "—"}</span>
                  </div>
                ))}
              </div>
            ) : <Skeleton className="h-40 w-full" />}
          </div>
        </div>

        {/* CENTER: GIS Map — THE HERO */}
        <div className="relative flex-1 min-w-0">
          {hotspotsLoading ? (
            <div className="h-full w-full flex items-center justify-center bg-sidebar/20">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-sidebar-muted mx-auto animate-spin" />
                <p className="mt-3 text-sm text-sidebar-muted">Loading Delhi...</p>
              </div>
            </div>
          ) : (
            <GisMap
              wards={(hotspots ?? []).filter(w => w.lat != null && w.lng != null).map(w => ({ ...w, lat: w.lat!, lng: w.lng! }))}
              theme="dark"
              height="h-full"
              className="rounded-none"
            />
          )}

          {/* Map overlay: secondary stats */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <div className="rounded-lg bg-sidebar/90 backdrop-blur border border-sidebar-border px-3 py-2">
              <p className="text-2xs text-sidebar-muted">Total filed</p>
              <p className="text-lg font-bold text-white tabular-nums">{kpis?.total_filed?.toLocaleString("en-IN") ?? "—"}</p>
            </div>
            <div className="rounded-lg bg-sidebar/90 backdrop-blur border border-sidebar-border px-3 py-2">
              <p className="text-2xs text-sidebar-muted">Resolved</p>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">
                {kpis?.total_filed ? `${Math.round(kpis.total_resolved / kpis.total_filed * 100)}%` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-sidebar/90 backdrop-blur border border-sidebar-border px-3 py-2">
              <p className="text-2xs text-sidebar-muted">Avg resolution</p>
              <p className="text-lg font-bold text-white tabular-nums">
                {kpis?.avg_resolution_hours != null ? `${Math.round(kpis.avg_resolution_hours)}h` : "—"}
              </p>
            </div>
          </div>

          {/* Map overlay: ward count */}
          <div className="absolute top-4 right-4 rounded-lg bg-sidebar/80 backdrop-blur border border-sidebar-border px-3 py-1.5">
            <p className="text-2xs text-sidebar-muted">{hotspots?.length ?? 0} wards monitored</p>
          </div>
        </div>

        {/* RIGHT: Trend + Citizen Journey */}
        <div className="flex w-64 shrink-0 flex-col gap-0 border-l border-sidebar-border bg-sidebar/30 overflow-y-auto scrollbar-thin">

          {/* 14-day trend chart */}
          <div className="border-b border-sidebar-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-sidebar-accent" />
              <p className="text-2xs font-bold uppercase tracking-wider text-sidebar-muted">14-Day Trend</p>
            </div>
            {trendByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={trendByDay} margin={{ left: -20, right: 4, top: 4 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(221 83% 60%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(221 83% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(215 19% 55%)" }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 8, fill: "hsl(215 19% 55%)" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(222 47% 13%)", border: "1px solid hsl(222 30% 22%)", borderRadius: 6, fontSize: 10 }} />
                  <Area type="monotone" dataKey="total" stroke="hsl(221 83% 60%)" strokeWidth={1.5} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-24 w-full" />}
          </div>

          {/* Live Citizen Journey */}
          <div className="flex-1 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-sidebar-accent" />
              <p className="text-2xs font-bold uppercase tracking-wider text-sidebar-muted">Live Citizen Journey</p>
            </div>

            {journey ? (
              <div>
                <div className="mb-2 rounded-md bg-white/5 px-2 py-1.5">
                  <p className="text-xs font-mono font-bold text-sidebar-accent">{journey.tracking_id}</p>
                  <p className="text-2xs text-sidebar-muted mt-0.5">
                    {journey.category ?? "Pending"} · {journey.department ?? "routing"} · via {journey.channel}
                  </p>
                  {journey.is_resolved && journey.resolution_hours != null && (
                    <p className="text-2xs text-emerald-400 mt-0.5">✓ Resolved in {journey.resolution_hours}h</p>
                  )}
                </div>

                <div className="space-y-0">
                  {journey.steps.map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          step.status === "done" ? "bg-emerald-500" :
                          step.status === "active" ? "bg-sidebar-accent ring-2 ring-sidebar-accent/30" :
                          "bg-sidebar-border"
                        )} />
                        {i < journey.steps.length - 1 && <span className="w-px flex-1 bg-sidebar-border my-0.5" style={{ minHeight: 8 }} />}
                      </div>
                      <div className="pb-2 min-w-0">
                        <p className={cn("text-2xs font-medium truncate",
                          step.status === "active" ? "text-white" : step.status === "done" ? "text-sidebar-foreground" : "text-sidebar-muted"
                        )}>{step.event}</p>
                        <div className="flex items-center gap-1">
                          {step.timestamp && <span className="text-2xs text-sidebar-muted font-mono">{step.timestamp}</span>}
                          <span className="text-2xs text-sidebar-muted truncate">· {step.detail}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="border-t border-sidebar-border p-3 space-y-1">
            {[
              { href: "/cm/analytics", label: "🤖 AI Chief Secretary" },
              { href: "/cm/hotspots", label: "🔥 Crisis Hotspots" },
              { href: "/cm/departments", label: "📊 Dept Leaderboard" },
              { href: "/cm/reports", label: "📋 Executive Brief" },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-2xs font-medium text-sidebar-foreground hover:bg-white/5 hover:text-white transition-colors">
                {l.label}
                <ArrowRight className="h-3 w-3 text-sidebar-muted" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
