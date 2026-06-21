"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  BarChart3,
  ArrowRight,
  Shield,
  Brain,
  Target,
  ChevronRight,
} from "lucide-react";
import { Skeleton, cn } from "@dcos/ui";
import {
  useKpis,
  useEconomicDrag,
  useWardIndex,
  usePredictions,
  useGovernanceScorecard,
} from "@/lib/hooks";

// ── Formatting helpers ─────────────────────────────────────────────────────────

function formatInr(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000)   return `₹${(n / 100_000).toFixed(1)} L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

function gradeColor(grade: string) {
  return grade === "A" ? "text-success" :
         grade === "B" ? "text-primary" :
         grade === "C" ? "text-warning" :
         grade === "D" ? "text-orange-600" : "text-destructive";
}

function wpiBar(wpi: number) {
  const color = wpi >= 65 ? "bg-success" : wpi >= 50 ? "bg-primary" : wpi >= 35 ? "bg-warning" : "bg-destructive";
  return (
    <div className="h-1.5 w-full bg-secondary/40 mt-1.5">
      <div className={`h-full ${color}`} style={{ width: `${wpi}%` }} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function IntelligenceOS() {
  const { data: kpis } = useKpis();
  const { data: drag, isLoading: dragLoading } = useEconomicDrag();
  const { data: wardIdx, isLoading: wardLoading } = useWardIndex();
  const { data: predictions } = usePredictions();
  const { data: scorecard } = useGovernanceScorecard();
  const router = useRouter();

  return (
    <div className="space-y-0 divide-y divide-border">

      {/* ── COMMAND HEADER ─────────────────────────────────────────────────── */}
      <div className="px-8 py-6 bg-card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="label-caps text-muted-foreground">Delhi Governance Intelligence Platform · Live</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              State Control Room
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {scorecard?.date} · City Health:{" "}
              <span className={cn("font-bold", scorecard ? gradeColor(scorecard.city_health_grade) : "")}>
                {scorecard?.city_health_grade ?? "—"} ({scorecard?.city_health_score?.toFixed(0) ?? "—"}/100)
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/wards">
              <button className="flex items-center gap-2 border border-outline-variant bg-white px-4 py-2 text-label-caps text-primary hover:bg-surface-dim transition-all">
                <BarChart3 className="h-3.5 w-3.5" />
                Ward Index
                <ChevronRight className="h-3 w-3" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── ECONOMIC DRAG — THE HEADLINE ───────────────────────────────────── */}
      <section className="px-8 py-6 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <IndianRupee className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-semibold text-foreground">Economic Drag</h2>
          <span className="label-caps text-muted-foreground">— cost of unresolved complaints</span>
        </div>

        {dragLoading ? (
          <Skeleton className="h-24" />
        ) : drag ? (
          <div className="grid grid-cols-1 gap-0 border border-outline-variant divide-y sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
            {/* Headline */}
            <div className="p-6 sm:col-span-1 bg-destructive/5 border-l-4 border-l-destructive">
              <p className="label-caps text-destructive">Daily Economic Drain</p>
              <p className="text-4xl font-bold text-destructive mt-2 tabular-nums">
                {formatInr(drag.total_daily_drag_inr)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {drag.trend_vs_last_week_pct > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-success" />
                )}
                <span className={cn("label-caps", drag.trend_vs_last_week_pct > 0 ? "text-destructive" : "text-success")}>
                  {drag.trend_vs_last_week_pct > 0 ? "+" : ""}{drag.trend_vs_last_week_pct.toFixed(0)}% vs last week
                </span>
              </div>
            </div>
            <div className="p-6">
              <p className="label-caps text-muted-foreground">Monthly Projection</p>
              <p className="text-3xl font-bold text-foreground mt-2 tabular-nums">{formatInr(drag.total_monthly_projection_inr)}</p>
              <p className="label-caps text-muted-foreground mt-2">at current rate</p>
            </div>
            <div className="p-6">
              <p className="label-caps text-muted-foreground">Annual Projection</p>
              <p className="text-3xl font-bold text-foreground mt-2 tabular-nums">{formatInr(drag.total_annual_projection_inr)}</p>
              <p className="label-caps text-muted-foreground mt-2">if nothing changes</p>
            </div>
            <div className="p-6">
              <p className="label-caps text-muted-foreground">Top Drain Category</p>
              <p className="text-base font-bold text-foreground mt-2">{drag.top_drain_category}</p>
              <p className="label-caps text-destructive mt-1">{formatInr(drag.top_drain_daily_inr)}/day</p>
            </div>
          </div>
        ) : null}

        {/* Category breakdown */}
        {drag && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border">
            {drag.by_category.slice(0, 8).map((cat) => (
              <div key={cat.category} className="bg-white px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{cat.category}</p>
                  <p className="label-caps text-muted-foreground">{cat.open_count} open · avg {cat.avg_days_open.toFixed(0)}d</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-bold text-destructive">{formatInr(cat.total_daily_drag)}/day</p>
                  <p className="label-caps text-muted-foreground">{formatInr(cat.daily_cost_per_complaint)}/complaint</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── WARD INDEX + KPIs ──────────────────────────────────────────────── */}
      <section className="px-8 py-6 bg-card">
        <div className="grid gap-6 lg:grid-cols-3">

          {/* WPI Summary */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Ward Productivity Index</h2>
            </div>
            {wardLoading ? <Skeleton className="h-64" /> : wardIdx ? (
              <div className="space-y-3">
                <div className="border border-outline-variant p-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="label-caps text-muted-foreground">City Average WPI</p>
                      <p className="text-5xl font-bold tabular-nums mt-1"
                         style={{ color: wardIdx.city_avg_wpi >= 65 ? '#1D7A4F' : wardIdx.city_avg_wpi >= 50 ? '#002652' : wardIdx.city_avg_wpi >= 35 ? '#B45309' : '#ba1a1a' }}>
                        {wardIdx.city_avg_wpi}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="label-caps text-destructive">{wardIdx.wards_in_crisis} in crisis</p>
                      <p className="label-caps text-muted-foreground">{wardIdx.total_wards_ranked} ranked</p>
                    </div>
                  </div>
                </div>
                <div className="border border-outline-variant divide-y divide-outline-variant">
                  <div className="px-3 py-2">
                    <p className="label-caps text-success mb-1.5">Top performing</p>
                    {wardIdx.top_5.slice(0, 3).map((w, i) => (
                      <p key={w} className="text-xs text-foreground py-0.5">
                        <span className="text-muted-foreground mr-2">#{i+1}</span>{w}
                      </p>
                    ))}
                  </div>
                  <div className="px-3 py-2">
                    <p className="label-caps text-destructive mb-1.5">Needs intervention</p>
                    {wardIdx.bottom_5.slice(-3).reverse().map((w) => (
                      <p key={w} className="text-xs text-foreground py-0.5">
                        <AlertTriangle className="inline h-3 w-3 text-destructive mr-1" />{w}
                      </p>
                    ))}
                  </div>
                </div>
                <Link href="/wards">
                  <button className="w-full border border-primary text-primary px-4 py-2.5 label-caps hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                    View all {wardIdx.total_wards_ranked} wards ranked
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>
            ) : null}
          </div>

          {/* KPIs */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Real-time Operations</h2>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border border border-border">
              {[
                { label: "Open Complaints",  value: kpis?.total_open,            accent: "text-warning",     sub: `${kpis?.sla_breaches_active ?? "—"} breaching SLA` },
                { label: "Filed Today",       value: kpis?.filed_today,           accent: "text-foreground",  sub: "citizens filing" },
                { label: "Resolved Today",    value: kpis?.resolved_today,        accent: "text-success",     sub: "cases closed" },
                { label: "SLA Breaches",      value: kpis?.sla_breaches_active,   accent: "text-destructive", sub: "overdue now" },
                { label: "Total Filed",       value: kpis?.total_filed,           accent: "text-foreground",  sub: "all time" },
                { label: "Avg Resolution",    value: kpis?.avg_resolution_hours != null ? `${Math.round(kpis.avg_resolution_hours)}h` : "—", accent: "text-foreground", sub: "end to end" },
              ].map((k) => (
                <div key={k.label} className="bg-white p-5">
                  <p className="label-caps text-muted-foreground">{k.label}</p>
                  <p className={cn("text-3xl font-bold tabular-nums mt-2", k.accent)}>{k.value ?? "—"}</p>
                  <p className="label-caps text-muted-foreground mt-1">{k.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PREDICTIVE INTELLIGENCE ───────────────────────────────────────── */}
      <section className="px-8 py-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Predictive Intelligence</h2>
            <span className="label-caps text-muted-foreground">— next 30 days</span>
          </div>
          {predictions && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="label-caps text-muted-foreground">Monsoon Risk</p>
                <p className={cn("text-lg font-bold tabular-nums",
                  predictions.monsoon_risk_score >= 80 ? "text-destructive" :
                  predictions.monsoon_risk_score >= 60 ? "text-warning" : "text-success"
                )}>{predictions.monsoon_risk_score}/100</p>
              </div>
              <div className="text-right">
                <p className="label-caps text-muted-foreground">At-risk wards</p>
                <p className="text-lg font-bold tabular-nums text-warning">{predictions.total_wards_at_risk}</p>
              </div>
              <div className="text-right">
                <p className="label-caps text-muted-foreground">Economic risk</p>
                <p className="text-lg font-bold tabular-nums text-destructive">₹{predictions.total_economic_risk_lakh}L</p>
              </div>
            </div>
          )}
        </div>

        {predictions && predictions.alerts.length > 0 ? (
          <div className="border border-outline-variant divide-y divide-outline-variant">
            {predictions.alerts.slice(0, 6).map((alert, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <span className={cn(
                  "label-caps px-2 py-1 shrink-0",
                  alert.urgency === "CRITICAL" ? "bg-destructive/10 text-destructive" :
                  alert.urgency === "HIGH" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                )}>{alert.urgency}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground"><span className="font-medium">{alert.ward_name}</span> — {alert.category}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.recommended_action}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-destructive">+{alert.predicted_spike_pct}%</p>
                  <p className="label-caps text-muted-foreground">{alert.days_until_peak}d to peak</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-outline-variant p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {predictions
                ? "No significant complaint spikes predicted in the next 30 days."
                : "Loading predictions..."}
            </p>
            {predictions?.monsoon_risk_score && predictions.monsoon_risk_score > 60 && (
              <p className="text-sm font-medium text-warning mt-2">
                ⚠ Monsoon risk {predictions.monsoon_risk_score}/100 — pre-position drainage teams
              </p>
            )}
          </div>
        )}

        {predictions && predictions.pre_emptive_budget_recommendation_lakh > 0 && (
          <div className="mt-3 border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-sm text-foreground">
                Pre-emptive budget recommendation:
                <span className="font-bold text-primary ml-1">₹{predictions.pre_emptive_budget_recommendation_lakh}L</span>
                <span className="text-muted-foreground ml-1">— prevents ₹{predictions.total_economic_risk_lakh}L in economic loss</span>
              </p>
            </div>
            <p className="label-caps text-success shrink-0 ml-4">
              ROI: {((predictions.total_economic_risk_lakh / Math.max(predictions.pre_emptive_budget_recommendation_lakh, 1)) * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </section>

      {/* ── CHIEF SECRETARY MORNING BRIEF ─────────────────────────────────── */}
      {scorecard && (
        <section className="px-8 py-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-semibold text-foreground">Action Items — Chief Secretary</h2>
            <span className="label-caps text-muted-foreground">· {scorecard.date}</span>
          </div>
          <div className="border border-outline-variant divide-y divide-outline-variant">
            {scorecard.chief_secretary_action_items.map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <span className="label-caps bg-primary text-white px-2 py-0.5 shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>

          {/* Weekly comparison */}
          <div className="mt-4 grid grid-cols-3 gap-px bg-border border border-border">
            {[
              { label: "Filed (7d)",    value: scorecard.complaints_filed_7d,    color: "text-foreground" },
              { label: "Resolved (7d)", value: scorecard.complaints_resolved_7d, color: "text-success" },
              { label: "Resolution %",  value: `${scorecard.resolution_rate_7d}%`, color: scorecard.resolution_rate_7d >= 60 ? "text-success" : "text-destructive" },
            ].map((m) => (
              <div key={m.label} className="bg-white px-4 py-3 text-center">
                <p className="label-caps text-muted-foreground">{m.label}</p>
                <p className={cn("text-2xl font-bold mt-1 tabular-nums", m.color)}>{m.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── QUICK NAVIGATION ──────────────────────────────────────────────── */}
      <section className="px-8 py-5 bg-white">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/wards",            label: "Ward Index",        sub: "272 wards ranked",  icon: BarChart3 },
            { href: "/cm/hotspots",      label: "Hotspot Map",       sub: "GIS intelligence",  icon: Target },
            { href: "/cm/departments",   label: "Departments",       sub: "Performance audit", icon: Shield },
            { href: "/cm/reports",       label: "Export & Reports",  sub: "Data downloads",    icon: TrendingUp },
          ].map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href}>
                <div className="border border-outline-variant bg-card p-4 hover:border-primary transition-all group cursor-pointer">
                  <Icon className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{l.label}</p>
                  <p className="label-caps text-muted-foreground mt-0.5">{l.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
