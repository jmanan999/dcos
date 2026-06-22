import * as React from "react";
import { cn } from "./utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[96px] w-full rounded-none border border-input bg-card px-3 py-2.5 text-sm text-foreground font-sans",
      "transition-colors placeholder:text-muted-foreground/60 resize-y",
      "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
