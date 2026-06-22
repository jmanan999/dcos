"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { FileText, CheckCircle2, Clock, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard, Skeleton, Badge } from "@dcos/ui";
import { usePublicStats } from "@/lib/hooks";
import { useLanguage } from "@/lib/i18n";

const CHART_COLOR = "hsl(215 100% 30%)";

export default function TransparencyOverview() {
  const { data } = usePublicStats();
  const { t } = useLanguage();

  const resolveRate =
    data && data.total_filed > 0 ? Math.round((data.total_resolved / data.total_filed) * 100) : null;

  const categoryData =
    data?.by_category.slice(0, 8).map((c) => ({
      name: c.category.replace(/_/g, " "),
      value: c.count,
    })) ?? [];

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-none" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-none" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("trans.complaints_filed")} value={data.total_filed.toLocaleString("en-IN")} icon={<FileText className="h-4 w-4" />} accent="primary" />
        <StatCard label={t("trans.resolved")} value={resolveRate != null ? `${resolveRate}%` : "—"} hint={`${data.total_resolved.toLocaleString("en-IN")} ${t("trans.n_complaints")}`} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
        <StatCard label={t("trans.currently_open")} value={data.total_open.toLocaleString("en-IN")} icon={<Clock className="h-4 w-4" />} accent="warning" />
        <StatCard label={t("trans.avg_resolution")} value={data.avg_resolution_hours != null ? `${Math.round(data.avg_resolution_hours)}h` : "—"} hint={t("trans.end_to_end")} icon={<Building2 className="h-4 w-4" />} accent="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("trans.top_categories")}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{t("trans.no_data")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="hsl(214 25% 89%)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(215 28% 95%)" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(214 25% 89%)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={CHART_COLOR} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Department performance */}
        <Card>
          <CardHeader>
            <CardTitle>{t("trans.dept_perf")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.by_department.slice(0, 8).map((d) => (
              <div key={d.department}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-foreground">{d.department}</span>
                  <span className="ml-2 shrink-0 font-semibold tabular-nums text-foreground">
                    {d.resolution_rate}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      d.resolution_rate >= 70 ? "bg-success" : d.resolution_rate >= 40 ? "bg-warning" : "bg-destructive"
                    }`}
                    style={{ inlineSize: `${Math.min(100, d.resolution_rate)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Hotspots */}
      <Card>
        <CardHeader>
          <CardTitle>{t("trans.hotspots")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.hotspots.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("trans.no_hotspots")}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.hotspots.slice(0, 9).map((h) => (
                <div
                  key={h.ward_name}
                  className="flex items-center justify-between rounded-none border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{h.ward_name}</p>
                    <p className="text-2xs text-muted-foreground">{h.total_count} {t("trans.total_filed")}</p>
                  </div>
                  <Badge variant={h.open_count >= 20 ? "error" : h.open_count >= 10 ? "warning" : "success"}>
                    {h.open_count} {t("trans.open_label")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {t("trans.anon_note")} {t("trans.open_api")}{" "}
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/citizen/public-stats`}
          target="_blank"
          rel="noopener"
          className="underline hover:text-foreground"
        >
          {t("trans.public_api")}
        </a>
      </p>
    </div>
  );
}
