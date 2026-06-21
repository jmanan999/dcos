import * as React from "react";
import { cn } from "./utils";

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

/* Rectangular chips — no pill radius. Status dot replaces background color. */
const variantClasses = {
  default: "bg-muted text-muted-foreground border border-border",
  success: "bg-success/8 text-success border border-success/20",
  warning: "bg-warning/8 text-warning border border-warning/20",
  error:   "bg-destructive/8 text-destructive border border-destructive/20",
  info:    "bg-primary/8 text-primary border border-primary/20",
  outline: "border border-border text-foreground bg-transparent",
};

const dotClasses = {
  default: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  error:   "bg-destructive",
  info:    "bg-primary",
  outline: "bg-muted-foreground",
};

export function Badge({
  variant = "default",
  dot,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5",
        "text-[10px] font-bold tracking-[0.08em] uppercase",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("h-[7px] w-[7px] rounded-full flex-shrink-0", dotClasses[variant])} />
      )}
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
      {label}
    </Badge>
  );
}

const STATUS_VARIANT: Record<GrievanceStatus, BadgeProps["variant"]> = {
  RECEIVED:      "default",
  CLASSIFIED:    "info",
  ASSIGNED:      "info",
  IN_PROGRESS:   "warning",
  ACTION_TAKEN:  "warning",
  RESOLVED:      "success",
  VERIFIED:      "success",
  CLOSED:        "success",
  REOPENED:      "error",
  ESCALATED:     "error",
  REJECTED_SPAM: "default",
};

const STATUS_LABEL: Record<GrievanceStatus, string> = {
  RECEIVED:      "Received",
  CLASSIFIED:    "Categorised",
  ASSIGNED:      "Assigned",
  IN_PROGRESS:   "In Progress",
  ACTION_TAKEN:  "Action Taken",
  RESOLVED:      "Resolved",
  VERIFIED:      "Verified",
  REOPENED:      "Reopened",
  CLOSED:        "Closed",
  REJECTED_SPAM: "Rejected",
  ESCALATED:     "Escalated",
};

export function StatusBadge({ status }: { status: GrievanceStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} dot>
      {STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
