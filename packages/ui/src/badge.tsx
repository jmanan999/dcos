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
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
  dot?: boolean;
}

const variantClasses = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  outline: "border border-border text-foreground",
};

const dotClasses = {
  default: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  outline: "bg-muted-foreground",
};

export function Badge({ variant = "default", dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[variant])} />}
      {children}
    </span>
  );
}

export function SeverityBadge({ score }: { score: number }) {
  const variant =
    score >= 80 ? "error" : score >= 60 ? "warning" : score >= 40 ? "info" : "success";
  const label =
    score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 40 ? "Medium" : "Low";
  return (
    <Badge variant={variant} dot>
      {label} · {score}
    </Badge>
  );
}

const STATUS_VARIANT: Record<GrievanceStatus, BadgeProps["variant"]> = {
  RECEIVED: "default",
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

const STATUS_LABEL: Record<GrievanceStatus, string> = {
  RECEIVED: "Received",
  CLASSIFIED: "Categorised",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  ACTION_TAKEN: "Action Taken",
  RESOLVED: "Resolved",
  VERIFIED: "Verified",
  REOPENED: "Reopened",
  CLOSED: "Closed",
  REJECTED_SPAM: "Rejected",
  ESCALATED: "Escalated",
};

export function StatusBadge({ status }: { status: GrievanceStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} dot>
      {STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
