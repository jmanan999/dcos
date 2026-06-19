import * as React from "react";
import { cn } from "./utils";

// Inline the GrievanceStatus type to avoid cross-package resolution issues in CI
type GrievanceStatus =
  | "RECEIVED"
  | "CLASSIFIED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "ACTION_TAKEN"
  | "RESOLVED"
  | "VERIFIED"
  | "REOPENED"
  | "CLOSED"
  | "REJECTED_SPAM"
  | "ESCALATED";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
}

const variantClasses = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export function SeverityBadge({ score }: { score: number }) {
  const variant =
    score >= 80 ? "error" : score >= 60 ? "warning" : score >= 40 ? "info" : "default";
  const label =
    score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 40 ? "Medium" : "Low";
  return (
    <Badge variant={variant}>
      {label} ({score})
    </Badge>
  );
}

const statusVariant: Record<GrievanceStatus, BadgeProps["variant"]> = {
  RECEIVED: "info",
  CLASSIFIED: "info",
  ASSIGNED: "info",
  IN_PROGRESS: "warning",
  ACTION_TAKEN: "warning",
  RESOLVED: "success",
  VERIFIED: "success",
  CLOSED: "success",
  REOPENED: "error",
  ESCALATED: "error",
  REJECTED_SPAM: "default",
};

export function StatusBadge({ status }: { status: GrievanceStatus }) {
  return <Badge variant={statusVariant[status]}>{status.replace("_", " ")}</Badge>;
}
