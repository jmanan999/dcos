import * as React from "react";
import { cn } from "./utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  accent?: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

const accentRing = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  danger: "text-destructive bg-destructive/10",
  info: "text-info bg-info/10",
  neutral: "text-muted-foreground bg-muted",
};

const trendColor = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  accent = "neutral",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              accentRing[accent]
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {trend && (
          <span className={cn("text-xs font-semibold", trendColor[trend.direction])}>
            {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.value}
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
