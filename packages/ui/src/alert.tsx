import * as React from "react";
import { cn } from "./utils";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  icon?: React.ReactNode;
  title?: string;
}

const variants = {
  info: "bg-info/8 border-info/25 text-info",
  success: "bg-success/8 border-success/25 text-success",
  warning: "bg-warning/10 border-warning/30 text-warning",
  error: "bg-destructive/8 border-destructive/25 text-destructive",
};

export function Alert({ variant = "info", icon, title, className, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", variants[variant], className)}
      {...props}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
    </div>
  );
}
