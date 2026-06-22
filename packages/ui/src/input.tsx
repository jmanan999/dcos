import * as React from "react";
import { cn } from "./utils";

/* IC Bold: sharp 1px border, amber focus ring, no shadow */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-none border border-input bg-card px-3 py-2",
        "text-sm text-foreground font-sans",
        "placeholder:text-muted-foreground/60",
        "transition-colors",
        "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
