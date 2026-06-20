"use client";

import useSWR from "swr";
import { Users } from "lucide-react";
import {
  PageHeader,
  Card,
  CardContent,
  DataTable,
  type Column,
  Badge,
  Skeleton,
  EmptyState,
  cn,
} from "@dcos/ui";
import { swrFetcher } from "@/lib/api";

type Officer = {
  officer_id: string;
  officer_name: string | null;
  total_assigned: number;
  in_progress: number;
  sla_breached: number;
  avg_resolution_hours: number | null;
  is_available: boolean;
};

const columns: Column<Officer>[] = [
  {
    key: "name",
    header: "Officer",
    render: (o) => <span className="font-medium text-foreground">{o.officer_name ?? "—"}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (o) => (
      <Badge variant={o.is_available ? "success" : "default"} dot>
        {o.is_available ? "Available" : "Unavailable"}
      </Badge>
    ),
  },
  {
    key: "assigned",
    header: "Assigned",
    align: "right",
    render: (o) => <span className="tabular-nums">{o.total_assigned}</span>,
  },
  {
    key: "in_progress",
    header: "In Progress",
    align: "right",
    render: (o) => <span className="tabular-nums">{o.in_progress}</span>,
  },
  {
    key: "sla",
    header: "SLA Breached",
    align: "right",
    render: (o) => (
      <span className={cn("tabular-nums", o.sla_breached > 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>
        {o.sla_breached}
      </span>
    ),
  },
  {
    key: "avg",
    header: "Avg Resolution",
    align: "right",
    render: (o) => (
      <span className="text-muted-foreground">
        {o.avg_resolution_hours != null ? `${o.avg_resolution_hours}h` : "—"}
      </span>
    ),
  },
];

export default function OfficerTeamPage() {
  const { data, isLoading } = useSWR<Officer[]>("/workforce/workload", swrFetcher, {
    refreshInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Team Workload" description="Department officer summary, sorted by SLA risk." />

      {isLoading ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No officers found"
              description="Your department has no officers, or you don't have team-view access."
            />
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} rows={data} rowKey={(o) => o.officer_id} />
      )}
    </div>
  );
}
