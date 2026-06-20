import * as React from "react";
import { cn } from "./utils";

export function Avatar({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        sizes[size],
        className
      )}
    >
      {initials || "?"}
    </span>
  );
}
