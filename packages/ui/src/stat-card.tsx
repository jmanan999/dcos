import * as React from "react";
import { cn } from "./utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  accent?: "primary" | "success" | "warning" | "danger" | "info" | "neutral" | "amber";
  className?: string;
}

const trendColor = {
  up:      "text-success",
  down:    "text-destructive",
  neutral: "text-muted-foreground",
};

const trendIcon = {
  up:      "↑",
  down:    "↓",
  neutral: "→",
};

/* IC Bold accent bar uses border-left 3px */
const accentBar = {
  primary: "border-l-foreground",
  amber:   "border-l-accent",
  success: "border-l-success",
  warning: "border-l-yellow-500",
  danger:  "border-l-destructive",
  info:    "border-l-info",
  neutral: "border-l-border",
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
        "border border-border border-l-[3px] bg-card px-6 py-5 transition-colors hover:bg-muted/40 rounded-none",
        accentBar[accent],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="label-caps text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground/40 text-lg">{icon}</span>}
      </div>
      <p className="mt-3 text-4xl font-black tracking-[-0.03em] text-foreground tabular-nums leading-none font-grotesk">
        {value}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {trend && (
          <span className={cn("label-caps flex items-center gap-0.5", trendColor[trend.direction])}>
            {trendIcon[trend.direction]} {trend.value}
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
