import * as React from "react";
import { cn } from "./utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

const variants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm focus-visible:ring-ring",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/70 focus-visible:ring-ring",
  outline:
    "border border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring",
  ghost: "bg-transparent text-foreground hover:bg-muted focus-visible:ring-ring",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm focus-visible:ring-destructive",
  success:
    "bg-success text-success-foreground hover:bg-success/90 shadow-sm focus-visible:ring-success",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-[15px]",
  icon: "h-9 w-9",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap",
        "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg
          className="h-3.5 w-3.5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
