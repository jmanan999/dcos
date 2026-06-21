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
    {
      value: fmt(data?.total_filed),
      label: "Complaints filed",
    },
    {
      value: resolveRate != null ? `${resolveRate}%` : "—",
      label: "Resolved on time",
    },
    {
      value: data?.avg_resolution_hours != null
        ? `${Math.round(data.avg_resolution_hours)}h`
        : "—",
      label: "Avg resolution time",
    },
    {
      value: fmt(data?.by_department?.length ?? 12),
      label: "Departments tracked",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
      {items.map((it) => (
        <div key={it.label} className="px-6 py-8 sm:px-8">
          <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {it.value}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
