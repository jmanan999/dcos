"use client";

import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@dcos/ui";
import { usePublicStats } from "@/lib/hooks";

export default function TransparencyMap() {
  const { data } = usePublicStats();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Map */}
      <Card className="lg:col-span-2">
        <CardContent className="p-0">
          <div className="flex h-[460px] items-center justify-center rounded-xl bg-muted/40">
            <div className="text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
                <MapPin className="h-6 w-6" />
              </span>
              <p className="text-sm font-medium text-foreground">Interactive ward heatmap</p>
              <p className="mt-1 text-xs text-muted-foreground">
                MapLibre GL + Delhi ward GeoJSON · {data?.hotspots.length ?? 0} wards with data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ward list */}
      <Card>
        <CardHeader>
          <CardTitle>Wards by open load</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="max-h-[380px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
              {data.hotspots.slice(0, 20).map((h) => (
                <div
                  key={h.ward_name}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="truncate text-sm text-foreground">{h.ward_name}</span>
                  <Badge variant={h.open_count >= 20 ? "error" : h.open_count >= 10 ? "warning" : "success"} dot>
                    {h.open_count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
