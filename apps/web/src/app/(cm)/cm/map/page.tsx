"use client";

import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@dcos/ui";
import { GisMap } from "@/components/GisMap";
import type { MapWard } from "@/components/GisMap";
import { useHotspots } from "@/lib/hooks";

const LEGEND = [
  { label: "High — 20+ open or >60% unresolved", color: "#ef4444" },
  { label: "Medium — 10–19 open", color: "#f59e0b" },
  { label: "Low — < 10 open", color: "#22c55e" },
];

export default function CMMap() {
  const { data, isLoading } = useHotspots(500);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
      <PageHeader
        title="GIS Ward Heatmap"
        description={`${data?.length ?? 0} Delhi wards · hover for details · circle size = complaint volume`}
        actions={
          <div className="flex items-center gap-3">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                {l.label}
              </span>
            ))}
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-4">
        {/* Map — takes 3/4 width */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
            <GisMap
              wards={(data ?? [])
                .filter((w) => w.lat != null && w.lng != null)
                .map((w): MapWard => ({ ...w, lat: w.lat!, lng: w.lng! }))}
              theme="dark"
              height="h-full"
              className="min-h-[500px]"
            />
          )}
        </div>

        {/* Sidebar — top wards */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle>Worst wards</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0 scrollbar-thin">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {(data ?? []).slice(0, 30).map((w) => (
                  <li key={w.ward_id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{w.ward_name}</p>
                      {w.district_name && (
                        <p className="text-2xs text-muted-foreground">{w.district_name}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {w.sla_breaches > 0 && (
                        <span className="text-2xs font-semibold text-destructive">
                          {w.sla_breaches}↑
                        </span>
                      )}
                      <Badge
                        variant={
                          w.severity === "high"
                            ? "error"
                            : w.severity === "medium"
                              ? "warning"
                              : "success"
                        }
                        dot
                      >
                        {w.open}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
