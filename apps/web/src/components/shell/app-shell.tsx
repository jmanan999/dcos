"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@dcos/ui";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import type { NavSection } from "./nav-config";

const STORAGE_KEY = "jansetu_sidebar_expanded";

export function AppShell({
  sections,
  brandTitle,
  brandSubtitle,
  children,
}: {
  sections: NavSection[];
  brandTitle: string;
  brandSubtitle: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setExpanded(saved === "true");
    } catch { /* ignore */ }
  }, []);

  const toggle = () => {
    setExpanded((v) => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const isActive = (href: string) =>
    href === pathname ||
    (href !== "/cm" && href !== "/officer" && href !== "/dept" && pathname.startsWith(href));

  const allItems = sections.flatMap((s) => s.items);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden lg:flex fixed left-0 top-0 h-full flex-col bg-primary z-50",
          "transition-[width] duration-200 ease-in-out",
          expanded ? "w-56" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center border-b border-white/10 overflow-hidden">
          <div className={cn("flex items-center gap-3 transition-all duration-200", expanded ? "px-4" : "justify-center w-full")}>
            <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center bg-white text-primary text-xs font-black select-none tracking-tight">
              JS
            </Link>
            {expanded && (
              <div className="leading-none min-w-0">
                <p className="text-sm font-bold text-white truncate">JanSetu</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider truncate">{brandSubtitle}</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 py-3 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {allItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={expanded ? undefined : item.label}
                className={cn(
                  "relative flex h-11 items-center transition-colors group overflow-hidden",
                  expanded ? "px-4 gap-3" : "justify-center",
                  active
                    ? "border-l-2 border-white bg-white/10 text-white"
                    : "border-l-2 border-transparent text-white/50 hover:bg-white/5 hover:text-white/80"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {expanded && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {!expanded && (
                  <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 py-3">
          {expanded && (
            <div className="px-4 pb-2">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">v0.1 · NCT Delhi</p>
            </div>
          )}
          <button
            onClick={toggle}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className={cn(
              "flex h-10 w-full items-center text-white/40 hover:text-white hover:bg-white/5 transition-colors",
              expanded ? "px-4 gap-3" : "justify-center"
            )}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
            {expanded && <span className="text-xs font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content — shifts with sidebar ──────────────────────────── */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-in-out",
          "lg:ml-20",
          expanded && "lg:ml-56"
        )}
      >
        <Topbar
          title={brandTitle}
          leading={<MobileNav sections={sections} brandTitle={brandTitle} />}
        />
        <main className="flex-1 overflow-auto p-6 lg:p-8 scrollbar-thin">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
