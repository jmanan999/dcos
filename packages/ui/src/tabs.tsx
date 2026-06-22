"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "./utils";

export const Tabs = TabsPrimitive.Root;

/* IC Bold: underline style tabs, no pill/bg, amber active border */
export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex items-center gap-0 border-b border-border bg-transparent",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 px-4 py-3 whitespace-nowrap",
      "text-[11px] font-black tracking-[0.1em] uppercase font-grotesk",
      "text-muted-foreground border-b-2 border-transparent -mb-px",
      "transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
      "disabled:pointer-events-none disabled:opacity-50",
      "hover:text-foreground hover:border-foreground/20",
      "data-[state=active]:text-foreground data-[state=active]:border-accent",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-6 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
