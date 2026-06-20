"use client";

import { Building2 } from "lucide-react";
import {
  PageHeader,
  Card,
  CardContent,
  DataTable,
  type Column,
  Badge,
  Button,
  Skeleton,
  EmptyState,
  cn,
} from "@dcos/ui";
import { useLeaderboard, type DeptRow } from "@/lib/hooks";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const columns: Column<DeptRow>[] = [
  { key: "rank", header: "#", render: (d) => <span className="text-muted-foreground">{d.rank}</span> },
  { key: "dept", header: "Department", render: (d) => <span className="font-medium text-foreground">{d.department}</span> },
  { key: "total", header: "Total", align: "right", render: (d) => <span className="tabular-nums">{d.total.toLocaleString("en-IN")}</span> },
  { key: "open", header: "Open", align: "right", render: (d) => <span className="tabular-nums text-warning">{d.open}</span> },
  {
    key: "rate",
    header: "Resolution",
    align: "right",
    render: (d) => (
      <Badge variant={d.resolution_rate != null && d.resolution_rate >= 70 ? "success" : d.resolution_rate != null && d.resolution_rate >= 40 ? "warning" : "error"}>
        {d.resolution_rate != null ? `${d.resolution_rate}%` : "—"}
      </Badge>
    ),
  },
  {
    key: "avg",
    header: "Avg Hours",
    align: "right",
    render: (d) => <span className="text-muted-foreground">{d.avg_resolution_hours != null ? `${d.avg_resolution_hours}h` : "—"}</span>,
  },
  {
    key: "csat",
    header: "CSAT",
    align: "right",
    render: (d) => <span className="text-muted-foreground">{d.avg_csat != null ? `${d.avg_csat}/5` : "—"}</span>,
  },
  {
    key: "sla",
    header: "SLA↑",
    align: "right",
    render: (d) => <span className={cn(d.sla_breaches > 0 && "font-semibold text-destructive")}>{d.sla_breaches}</span>,
  },
];

export default function CMDepartments() {
  const { data, isLoading } = useLeaderboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Leaderboard"
        description="Performance ranked by resolution rate, with SLA and CSAT."
        actions={
          <a href={`${API}/api/v1/reporting/export/dept-scorecard`} target="_blank" rel="noopener">
            <Button variant="outline">Export CSV</Button>
          </a>
        }
      />
      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={<Building2 className="h-6 w-6" />} title="No data" description="Run migrations and seed the database." />
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} rows={data} rowKey={(d) => d.department} />
      )}
    </div>
  );
}
