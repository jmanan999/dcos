import * as React from "react";
import { cn } from "./utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "amber";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

/* IC Bold: sharp corners, no shadow, bold typography */
const variants = {
  primary:
    "bg-foreground text-background hover:bg-foreground/85 focus-visible:ring-ring",
  amber:
    "bg-accent text-accent-foreground hover:bg-accent-hover focus-visible:ring-ring",
  secondary:
    "bg-muted text-foreground hover:bg-muted/70 border border-border focus-visible:ring-ring",
  outline:
    "border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background focus-visible:ring-ring",
  ghost:
    "bg-transparent text-foreground hover:bg-muted focus-visible:ring-ring",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/85 focus-visible:ring-destructive",
  success:
    "bg-success text-success-foreground hover:bg-success/85 focus-visible:ring-success",
};

const sizes = {
  sm:   "h-8 px-4 text-[10px] font-black tracking-[0.12em] uppercase",
  md:   "h-10 px-5 text-[11px] font-black tracking-[0.12em] uppercase",
  lg:   "h-12 px-8 text-[11px] font-black tracking-[0.12em] uppercase",
  icon: "h-9 w-9",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-none whitespace-nowrap font-grotesk",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-40",
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
