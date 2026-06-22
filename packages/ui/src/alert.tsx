import * as React from "react";
import { cn } from "./utils";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error" | "amber";
  icon?: React.ReactNode;
  title?: string;
}

/* IC Bold: left-border accent, no radius, minimal bg fill */
const variants = {
  info:    "border-l-[3px] border-l-foreground border border-border bg-muted/40 text-foreground",
  success: "border-l-[3px] border-l-success border border-success/20 bg-success/5 text-foreground",
  warning: "border-l-[3px] border-l-yellow-500 border border-yellow-200 bg-yellow-50 text-foreground",
  error:   "border-l-[3px] border-l-destructive border border-destructive/20 bg-destructive/5 text-foreground",
  amber:   "border-l-[3px] border-l-accent border border-accent/20 bg-accent/5 text-foreground",
};

export function Alert({ variant = "info", icon, title, className, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("flex gap-3 rounded-none px-4 py-3 text-sm", variants[variant], className)}
      {...props}
    >
      {icon && <span className="mt-0.5 shrink-0 text-base">{icon}</span>}
      <div className="space-y-0.5">
        {title && <p className="font-bold text-[11px] tracking-[0.1em] uppercase font-grotesk">{title}</p>}
        {children && <div className="text-muted-foreground text-sm leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
