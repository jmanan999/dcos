"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hourglass, AlertTriangle } from "lucide-react";
import { PageHeader, Skeleton, Badge, cn } from "@dcos/ui";
import { usePendency, useDeptQueue } from "@/lib/hooks";
import { ageDays, slaCountdown } from "@/lib/sla";

const BUCKET_RANGES: [number, number | null][] = [
  [0, 7],
  [8, 15],
  [16, 30],
  [31, null],
];

export default function PendencyMonitor() {
  const { data: pendency, isLoading } = usePendency();
  const { data: queue } = useDeptQueue();
  const [active, setActive] = useState<number | null>(null);
  const router = useRouter();

  const rows =
    queue
      ?.filter((g) => !["RESOLVED", "VERIFIED", "CLOSED", "REJECTED_SPAM"].includes(g.status))
      .filter((g) => {
        if (active === null) return true;
        const [lo, hi] = BUCKET_RANGES[active];
        const age = ageDays(g.created_at);
        return age >= lo && (hi === null || age <= hi);
      })
      .sort((a, b) => ageDays(b.created_at) - ageDays(a.created_at)) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendency Monitor"
        description="Open grievances by age — the metric the public actually judges you on. Click a band to inspect."
      />

      {/* Aging bands */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-none" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-border divide-x divide-border">
          {pendency?.buckets.map((b, i) => {
            const isAged = i >= 2; // 16-30 and 30+ are the danger bands
            return (
              <button
                key={b.label}
                onClick={() => setActive(active === i ? null : i)}
                className={cn(
                  "px-5 py-5 text-left transition-colors",
                  active === i ? "bg-secondary/50" : "hover:bg-muted/40",
                  i > 0 && "border-l-0"
                )}
              >
                <p className="label-caps text-muted-foreground">{b.label}</p>
                <p
                  className={cn(
                    "mt-2 text-4xl font-bold tabular-nums leading-none",
                    isAged && b.count > 0 ? "text-destructive" : "text-foreground"
                  )}
                >
                  {b.count}
                </p>
                <p className="mt-2 label-caps text-muted-foreground">
                  {b.breached} past SLA
                </p>
              </button>
            );
          })}
        </div>
      )}

      {pendency && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{pendency.total_open}</span> open ·
          oldest pending case is{" "}
          <span className="font-semibold text-foreground">
            {pendency.oldest_days ?? 0} days
          </span>{" "}
          old
          {active !== null && (
            <button onClick={() => setActive(null)} className="ml-3 text-primary hover:underline">
              clear filter
            </button>
          )}
        </p>
      )}

      {/* Drill-down list */}
      <div className="border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim border-b border-border">
                <th className="px-4 py-3 label-caps text-muted-foreground">Tracking ID</th>
                <th className="px-4 py-3 label-caps text-muted-foreground">Issue</th>
                <th className="px-4 py-3 label-caps text-muted-foreground text-right">Age</th>
                <th className="px-4 py-3 label-caps text-muted-foreground">Status</th>
                <th className="px-4 py-3 label-caps text-muted-foreground text-right">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {queue ? "Nothing pending in this band." : "Loading…"}
                  </td>
                </tr>
              ) : (
                rows.slice(0, 100).map((g) => {
                  const age = ageDays(g.created_at);
                  const sla = slaCountdown(g.sla_due_at, g.is_sla_breached);
                  return (
                    <tr
                      key={g.id}
                      onClick={() => router.push(`/officer/grievance/${g.id}`)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                        {g.tracking_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground max-w-[280px] truncate">
                        {g.category ?? "Uncategorised"}
                        <span className="text-muted-foreground"> · {g.raw_text}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">
                        <span className={age > 15 ? "font-semibold text-destructive" : "text-foreground"}>
                          {age}d
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {g.is_emergency ? (
                          <Badge variant="error" dot>
                            <AlertTriangle className="h-3 w-3" /> Emergency
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{g.status.replace(/_/g, " ")}</span>
                        )}
                      </td>
                      <td className={cn("px-4 py-3 text-right text-xs", sla.tone)}>{sla.label}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length === 0 && queue && queue.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hourglass className="h-4 w-4" /> No open grievances for your department.
        </div>
      )}
    </div>
  );
}
