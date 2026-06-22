"use client";

import { Flame } from "lucide-react";
import {
  PageHeader,
  Card,
  CardContent,
  DataTable,
  type Column,
  Badge,
  Skeleton,
  EmptyState,
} from "@dcos/ui";
import { useHotspots, type WardHotspot } from "@/lib/hooks";

const columns: Column<WardHotspot>[] = [
  {
    key: "ward",
    header: "Ward",
    render: (h) => (
      <div>
        <p className="font-medium text-foreground">{h.ward_name}</p>
        <p className="text-2xs text-muted-foreground">{h.district_name ?? "—"}</p>
      </div>
    ),
  },
  { key: "total", header: "Total", align: "right", render: (h) => <span className="tabular-nums">{h.total}</span> },
  { key: "open", header: "Open", align: "right", render: (h) => <span className="font-medium tabular-nums text-warning">{h.open}</span> },
  {
    key: "sla",
    header: "SLA Breaches",
    align: "right",
    render: (h) => (
      <span className={h.sla_breaches > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
        {h.sla_breaches}
      </span>
    ),
  },
  {
    key: "severity",
    header: "Severity",
    align: "right",
    render: (h) => (
      <Badge variant={h.severity === "high" ? "error" : h.severity === "medium" ? "warning" : "success"} dot>
        {h.severity}
      </Badge>
    ),
  },
];

export default function CMHotspots() {
  const { data, isLoading } = useHotspots(200);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hotspot Intelligence"
        description="Wards ranked by open complaint load — surface emerging problem areas early."
      />
      {isLoading ? (
        <Skeleton className="h-96 rounded-none" />
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={<Flame className="h-6 w-6" />} title="No hotspot data" description="Run migrations and seed the database." />
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} rows={data} rowKey={(h) => h.ward_id} />
      )}
    </div>
  );
}
