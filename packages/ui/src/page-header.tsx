import * as React from "react";
import { cn } from "./utils";

/* IC Bold: amber left-border accent, Space Grotesk title */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-6 sm:flex-row sm:items-start sm:justify-between border-b border-border",
        className
      )}
    >
      <div className="flex gap-0">
        {/* Amber accent bar */}
        <div className="w-[3px] bg-accent self-stretch mr-4 shrink-0" />
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black tracking-[-0.025em] text-foreground font-grotesk leading-none">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">{actions}</div>
      )}
    </div>
  );
}
