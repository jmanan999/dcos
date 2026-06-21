"use client";

import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@dcos/ui";
import { GisMap, type MapWard } from "@/components/GisMap";
import { usePublicStats } from "@/lib/hooks";
import { useLanguage } from "@/lib/i18n";

export default function TransparencyMap() {
  const { data } = usePublicStats();
  const { t } = useLanguage();

  const wards: MapWard[] = (data?.hotspots ?? [])
    .filter((h) => h.lat && h.lng)
    .map((h) => ({
      ward_name: h.ward_name,
      lat: h.lat,
      lng: h.lng,
      open: h.open_count,
      total: h.total_count,
    }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Map */}
      <div className="lg:col-span-2">
        {wards.length === 0 ? (
          <Skeleton className="h-[460px] w-full" />
        ) : (
          <GisMap wards={wards} theme="light" height="h-[460px]" />
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {wards.length} {t("trans.map_legend")} ·{" "}
          <span className="font-medium text-destructive">●</span> {t("trans.high_load")} ·{" "}
          <span className="font-medium text-warning">●</span> {t("trans.medium_load")} ·{" "}
          <span className="font-medium text-success">●</span> {t("trans.low_load")}
        </p>
      </div>

      {/* Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle>{t("trans.wards_by_load")}</CardTitle>
        </CardHeader>
        <CardContent>
          {wards.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : (
            <div className="max-h-[380px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
              {wards
                .sort((a, b) => b.open - a.open)
                .slice(0, 20)
                .map((w) => {
                  const ratio = w.total > 0 ? w.open / w.total : 0;
                  const sev =
                    w.open >= 20 || ratio > 0.6
                      ? "error"
                      : w.open >= 10 || ratio > 0.3
                        ? "warning"
                        : "success";
                  return (
                    <div
                      key={w.ward_name}
                      className="flex items-center justify-between border border-border px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{w.ward_name}</p>
                        <p className="text-2xs text-muted-foreground">{w.total} {t("trans.total_filed")}</p>
                      </div>
                      <Badge variant={sev} dot>
                        {w.open} {t("trans.open_label")}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
