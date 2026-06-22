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
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline" | "amber";
  dot?: boolean;
}

/* IC Bold: sharp, uppercase label-caps, left-border accent */
const variantClasses = {
  default: "bg-muted text-muted-foreground border border-border",
  success: "bg-success/10 text-success border border-success/25",
  warning: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  error:   "bg-destructive/10 text-destructive border border-destructive/25",
  info:    "bg-foreground/5 text-foreground border border-foreground/15",
  outline: "border border-border text-foreground bg-transparent",
  amber:   "bg-accent/10 text-accent border border-accent/25",
};

const dotClasses = {
  default: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-yellow-500",
  error:   "bg-destructive",
  info:    "bg-foreground",
  outline: "bg-muted-foreground",
  amber:   "bg-accent",
};

export function Badge({ variant = "default", dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none",
        "text-[10px] font-black tracking-[0.1em] uppercase font-grotesk",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("h-[6px] w-[6px] rounded-full flex-shrink-0", dotClasses[variant])} />
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
  return <Badge variant={variant} dot>{label}</Badge>;
}

const STATUS_VARIANT: Record<GrievanceStatus, BadgeProps["variant"]> = {
  RECEIVED:      "default",
  CLASSIFIED:    "info",
  ASSIGNED:      "info",
  IN_PROGRESS:   "amber",
  ACTION_TAKEN:  "amber",
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
