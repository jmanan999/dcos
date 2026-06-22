"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import {
  PageHeader,
  Card,
  CardContent,
  DataTable,
  type Column,
  StatusBadge,
  SeverityBadge,
  Badge,
  Skeleton,
  EmptyState,
  cn,
} from "@dcos/ui";
import { useQueue, type QueueItem } from "@/lib/hooks";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "ESCALATED", label: "Escalated" },
  { key: "breached", label: "SLA Breached" },
];

function slaCountdown(due: string | null, breached: boolean): { label: string; tone: string } {
  if (!due) return { label: "—", tone: "text-muted-foreground" };
  const ms = new Date(due).getTime() - Date.now();
  if (breached || ms < 0) return { label: "Overdue", tone: "text-destructive font-semibold" };
  const hrs = Math.floor(ms / 3.6e6);
  if (hrs < 6) return { label: `${hrs}h left`, tone: "text-warning font-medium" };
  if (hrs < 24) return { label: `${hrs}h left`, tone: "text-foreground" };
  return { label: `${Math.floor(hrs / 24)}d left`, tone: "text-muted-foreground" };
}

export default function OfficerQueue() {
  const { data: queue, isLoading } = useQueue();
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  const rows = useMemo(() => {
    if (!queue) return [];
    if (filter === "all") return queue;
    if (filter === "breached") return queue.filter((g) => g.is_sla_breached);
    return queue.filter((g) => g.status === filter);
  }, [queue, filter]);

  const columns: Column<QueueItem>[] = [
    {
      key: "id",
      header: "Complaint",
      render: (g) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-foreground">{g.tracking_id}</p>
          <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">{g.raw_text}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (g) => <span className="text-sm text-foreground">{g.category ?? "—"}</span>,
    },
    {
      key: "severity",
      header: "Severity",
      render: (g) => (g.severity != null ? <SeverityBadge score={g.severity} /> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: "status",
      header: "Status",
      render: (g) => <StatusBadge status={g.status as never} />,
    },
    {
      key: "sla",
      header: "SLA",
      align: "right",
      render: (g) => {
        const s = slaCountdown(g.sla_due_at, g.is_sla_breached);
        return <span className={cn("text-xs", s.tone)}>{s.label}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Queue" description="Grievances assigned to you, sorted by SLA urgency." />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? queue?.length ?? 0
              : f.key === "breached"
                ? queue?.filter((g) => g.is_sla_breached).length ?? 0
                : queue?.filter((g) => g.status === f.key).length ?? 0;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-none px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground ring-1 ring-border hover:bg-muted"
              )}
            >
              {f.label}
              <Badge variant={filter === f.key ? "outline" : "default"} className={filter === f.key ? "border-white/30 text-primary-foreground" : ""}>
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-none" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<ListChecks className="h-6 w-6" />}
              title="Nothing here"
              description="No grievances match this filter."
            />
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(g) => g.id}
          onRowClick={(g) => router.push(`/officer/grievance/${g.id}`)}
        />
      )}
    </div>
  );
}
