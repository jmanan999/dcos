import * as React from "react";
import { cn } from "./utils";

export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-[3px] w-full overflow-hidden rounded-none bg-border", className)}>
      <div
        className={cn("h-full rounded-none bg-accent transition-all duration-500", indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
