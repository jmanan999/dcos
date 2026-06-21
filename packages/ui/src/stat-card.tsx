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

const trendColor = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
};

const accentBar = {
  primary: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-destructive",
  info: "border-l-info",
  neutral: "border-l-transparent",
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
        "border border-border border-l-4 bg-card px-6 py-5 transition-colors hover:bg-muted/30",
        accentBar[accent],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="label-caps text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight text-foreground tabular-nums leading-none">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {trend && (
          <span className={cn("label-caps", trendColor[trend.direction])}>
            {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}{" "}
            {trend.value}
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
