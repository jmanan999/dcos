"use client";

import { usePublicStats } from "@/lib/hooks";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

export function LiveStats() {
  const { data } = usePublicStats();

  const resolveRate =
    data && data.total_filed > 0
      ? Math.round((data.total_resolved / data.total_filed) * 100)
      : null;

  const items = [
    { label: "Complaints filed", value: fmt(data?.total_filed) },
    { label: "Resolved", value: resolveRate != null ? `${resolveRate}%` : "—" },
    {
      label: "Avg resolution",
      value: data?.avg_resolution_hours != null ? `${Math.round(data.avg_resolution_hours)}h` : "—",
    },
    { label: "Departments", value: fmt(data?.by_department.length ?? 12) },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="bg-card px-5 py-6 text-center">
          <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {it.value}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
