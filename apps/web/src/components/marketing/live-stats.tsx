"use client";

import { usePublicStats } from "@/lib/hooks";
import { useLanguage } from "@/lib/i18n";
import { TrendingUp } from "lucide-react";

export function LiveStats() {
  const { data } = usePublicStats();
  const { t } = useLanguage();

  const resolveRate =
    data && data.total_filed > 0
      ? Math.round((data.total_resolved / data.total_filed) * 100)
      : null;

  const items = [
    { label: t("stats.filed"),    sub: t("stats.filed_sub"),    value: data?.total_filed?.toLocaleString("en-IN") ?? "—" },
    { label: t("stats.resolved"), sub: t("stats.resolved_sub"), value: resolveRate != null ? `${resolveRate}%` : "—" },
    { label: t("stats.avg"),      sub: t("stats.avg_sub"),      value: data?.avg_resolution_hours != null ? `${Math.round(data.avg_resolution_hours)}h` : "—" },
    { label: t("stats.depts"),    sub: t("stats.depts_sub"),    value: String(data?.by_department?.length ?? 12) },
  ];

  return (
    <div className="grid grid-cols-2 divide-x divide-outline-variant sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="group px-6 py-8 sm:px-8 transition-colors hover:bg-surface-dim/50">
          <p className="label-caps text-on-surface-variant group-hover:text-primary transition-colors">{it.label}</p>
          <p className="mt-3 text-4xl font-bold text-on-surface tabular-nums leading-none">{it.value}</p>
          <p className="mt-1.5 flex items-center gap-1 label-caps text-primary">
            <TrendingUp className="h-3 w-3" />{it.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
