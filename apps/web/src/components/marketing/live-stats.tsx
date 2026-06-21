"use client";

import { usePublicStats } from "@/lib/hooks";
import { TrendingUp } from "lucide-react";

export function LiveStats() {
  const { data } = usePublicStats();

  const resolveRate =
    data && data.total_filed > 0
      ? Math.round((data.total_resolved / data.total_filed) * 100)
      : null;

  const items = [
    { label: "Complaints filed",   value: data?.total_filed?.toLocaleString("en-IN") ?? "—", trend: "All time" },
    { label: "Resolved on time",   value: resolveRate != null ? `${resolveRate}%` : "—", trend: "Within SLA" },
    { label: "Avg resolution",     value: data?.avg_resolution_hours != null ? `${Math.round(data.avg_resolution_hours)}h` : "—", trend: "End to end" },
    { label: "Departments tracked",value: String(data?.by_department?.length ?? 12), trend: "Full coverage" },
  ];

  return (
    <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="group px-8 py-10 transition-colors hover:bg-secondary/30">
          <p className="label-caps text-muted-foreground group-hover:text-primary transition-colors">
            {it.label}
          </p>
          <p className="mt-4 text-5xl font-bold text-foreground tabular-nums tracking-tight">
            {it.value}
          </p>
          <div className="mt-3 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-primary" />
            <p className="label-caps text-primary">{it.trend}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
