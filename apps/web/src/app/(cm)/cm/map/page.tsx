"use client";

import { MapPin } from "lucide-react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
} from "@dcos/ui";
import { useHotspots } from "@/lib/hooks";

const LEGEND = [
  { label: "High (20+ open)", variant: "error" as const },
  { label: "Medium (10–19)", variant: "warning" as const },
  { label: "Low (<10)", variant: "success" as const },
];

export default function CMMap() {
  const { data } = useHotspots(200);

  return (
    <div className="space-y-6">
      <PageHeader title="GIS Heatmap" description="Ward-level grievance density across Delhi NCT." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex h-[520px] flex-col items-center justify-center rounded-xl bg-muted/40">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
                <MapPin className="h-6 w-6" />
              </span>
              <p className="text-sm font-medium text-foreground">Interactive MapLibre heatmap</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data?.length ?? 0} wards · red/yellow/green by open load
              </p>
              <div className="mt-5 flex gap-3">
                {LEGEND.map((l) => (
                  <Badge key={l.label} variant={l.variant} dot>
                    {l.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worst wards</CardTitle>
          </CardHeader>
          <CardContent>
            {!data ? (
              <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-11 rounded-lg" />)}</div>
            ) : (
              <div className="max-h-[440px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
                {data.slice(0, 20).map((h) => (
                  <div key={h.ward_id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="truncate text-sm text-foreground">{h.ward_name}</span>
                    <Badge variant={h.severity === "high" ? "error" : h.severity === "medium" ? "warning" : "success"} dot>
                      {h.open}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
