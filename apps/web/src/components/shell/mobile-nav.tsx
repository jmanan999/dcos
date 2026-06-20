"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldCheck } from "lucide-react";
import { cn } from "@dcos/ui";
import type { NavSection } from "./nav-config";

export function MobileNav({
  sections,
  brandTitle,
}: {
  sections: NavSection[];
  brandTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-sidebar p-4 animate-fade-in">
            <div className="flex items-center justify-between px-1 py-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-white">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="text-sm font-bold text-white">{brandTitle}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-sidebar-muted hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-4 space-y-1">
              {sections.flatMap((s) => s.items).map((item) => {
                const active = pathname === item.href || (item.href !== "/cm" && item.href !== "/officer" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-sidebar-accent/15 text-white"
                        : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
