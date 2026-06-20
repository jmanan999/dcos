"use client";

import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { FileText, Clock, CheckCircle2, AlertTriangle, Flame, ArrowRight } from "lucide-react";
import {
  PageHeader,
  StatCard,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
} from "@dcos/ui";
import { useKpis, useHotspots, useLeaderboard, useTrend } from "@/lib/hooks";

export default function CMOverview() {
  const { data: kpis } = useKpis();
  const { data: hotspots } = useHotspots(8);
  const { data: leaderboard } = useLeaderboard();
  const { data: trend } = useTrend(14);

  // Aggregate trend by day
  const trendByDay = (() => {
    if (!trend) return [];
    const map = new Map<string, number>();
    for (const t of trend) {
      const day = new Date(t.day).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      map.set(day, (map.get(day) ?? 0) + t.total);
    }
    return Array.from(map.entries()).map(([day, total]) => ({ day, total }));
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delhi at a Glance"
        description="Live grievance intelligence across the National Capital Territory."
        actions={
          <Badge variant="success" dot>
            Live
          </Badge>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis ? (
          <>
            <StatCard label="Filed today" value={kpis.filed_today.toLocaleString("en-IN")} icon={<FileText className="h-4 w-4" />} accent="primary" />
            <StatCard label="Open backlog" value={kpis.total_open.toLocaleString("en-IN")} icon={<Clock className="h-4 w-4" />} accent="warning" />
            <StatCard label="Resolved today" value={kpis.resolved_today.toLocaleString("en-IN")} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
            <StatCard label="SLA breaches" value={kpis.sla_breaches_active.toLocaleString("en-IN")} hint="active now" icon={<AlertTriangle className="h-4 w-4" />} accent="danger" />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        )}
      </div>

      {/* Trend + secondary KPIs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Complaints filed — last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {trendByDay.length === 0 ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <AreaChart data={trendByDay} margin={{ left: 4, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(221 70% 45%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(221 70% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(214 25% 89%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 25% 89%)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" stroke="hsl(221 70% 45%)" strokeWidth={2} fill="url(#fill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <StatCard label="Total filed (all-time)" value={kpis?.total_filed.toLocaleString("en-IN") ?? "—"} accent="neutral" />
          <StatCard label="Avg resolution" value={kpis?.avg_resolution_hours != null ? `${Math.round(kpis.avg_resolution_hours)}h` : "—"} hint="end-to-end" accent="neutral" />
          <StatCard label="Citizen CSAT" value={kpis?.avg_csat != null ? `${kpis.avg_csat}/5` : "—"} accent="neutral" />
        </div>
      </div>

      {/* Hotspots + leaderboard */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-destructive" /> Top hotspots
            </CardTitle>
            <Link href="/cm/hotspots" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {!hotspots ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)
            ) : (
              hotspots.map((h) => (
                <div key={h.ward_id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{h.ward_name}</p>
                    <p className="text-2xs text-muted-foreground">{h.district_name ?? "—"} · {h.total} total</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.sla_breaches > 0 && <span className="text-2xs font-semibold text-destructive">{h.sla_breaches} SLA↑</span>}
                    <Badge variant={h.severity === "high" ? "error" : h.severity === "medium" ? "warning" : "success"} dot>
                      {h.open} open
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Department leaderboard</CardTitle>
            <Link href="/cm/departments" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {!leaderboard ? (
              <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 rounded" />)}</div>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/60">
                  {leaderboard.slice(0, 6).map((d) => (
                    <tr key={d.department}>
                      <td className="py-2 pr-2 text-muted-foreground">{d.rank}</td>
                      <td className="py-2 pr-2 font-medium text-foreground">{d.department}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-warning">{d.open}</td>
                      <td className="py-2 text-right">
                        <span className={d.resolution_rate != null && d.resolution_rate >= 70 ? "font-semibold text-success" : d.resolution_rate != null && d.resolution_rate >= 40 ? "text-warning" : "text-destructive"}>
                          {d.resolution_rate != null ? `${d.resolution_rate}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Link href="/cm/map" className="block">
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="flex items-center justify-between py-5">
            <div>
              <p className="font-semibold text-foreground">Open the GIS heatmap</p>
              <p className="text-sm text-muted-foreground">Ward-level red/yellow/green view with drill-down.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
