import * as React from "react";
import { cn } from "./utils";

/* IC Bold: centered, bold typography, amber accent, no radius border */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-border bg-card px-6 py-16 text-center rounded-none",
        className
      )}
    >
      {icon && (
        <div className="mb-5 flex h-12 w-12 items-center justify-center bg-muted text-muted-foreground rounded-none">
          {icon}
        </div>
      )}
      <p className="text-base font-black tracking-tight text-foreground font-grotesk">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
