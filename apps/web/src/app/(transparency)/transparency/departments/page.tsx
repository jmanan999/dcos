"use client";

import { Card, CardContent, DataTable, type Column, Skeleton, Badge } from "@dcos/ui";
import { usePublicStats } from "@/lib/hooks";
import { useLanguage } from "@/lib/i18n";

type Row = { department: string; total: number; resolved: number; resolution_rate: number };

export default function TransparencyDepartments() {
  const { data } = usePublicStats();
  const { t } = useLanguage();

  const columns: Column<Row>[] = [
    {
      key: "rank",
      header: "#",
      render: (_r, i) => <span className="text-muted-foreground">{i + 1}</span>,
    },
    {
      key: "department",
      header: t("trans.dept_col"),
      render: (r) => <span className="font-medium text-foreground">{r.department}</span>,
    },
    {
      key: "total",
      header: t("trans.total_col"),
      align: "right",
      render: (r) => <span className="tabular-nums">{r.total.toLocaleString("en-IN")}</span>,
    },
    {
      key: "resolved",
      header: t("trans.resolved_col"),
      align: "right",
      render: (r) => <span className="tabular-nums">{r.resolved.toLocaleString("en-IN")}</span>,
    },
    {
      key: "rate",
      header: t("trans.rate_col"),
      align: "right",
      render: (r) => (
        <Badge variant={r.resolution_rate >= 70 ? "success" : r.resolution_rate >= 40 ? "warning" : "error"}>
          {r.resolution_rate}%
        </Badge>
      ),
    },
  ];

  if (!data) return <Skeleton className="h-96" />;

  const rows = [...data.by_department].sort((a, b) => b.resolution_rate - a.resolution_rate);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("trans.dept_desc")}</p>
      <Card className="p-0">
        <CardContent className="p-0">
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.department} />
        </CardContent>
      </Card>
    </div>
  );
}
