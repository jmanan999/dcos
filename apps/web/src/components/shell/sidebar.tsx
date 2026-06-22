"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@dcos/ui";
import type { NavSection } from "./nav-config";

const STORAGE_KEY = "jansetu_sidebar_expanded";

export function Sidebar({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

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
    href === pathname || (href !== "/cm" && href !== "/officer" && pathname.startsWith(href));

  const allItems = sections.flatMap((s) => s.items);

  return (
    <aside
      className={cn(
        "hidden lg:flex fixed left-0 top-0 h-full flex-col bg-[#0D2318] z-50 transition-[width] duration-200 ease-in-out border-r border-[#163D2A]",
        expanded ? "w-56" : "w-[68px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center border-b border-[#163D2A] overflow-hidden">
        <div className={cn(
          "flex items-center gap-3 transition-all duration-200",
          expanded ? "px-4" : "justify-center w-full"
        )}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="JanSetu" className="h-8 w-8 shrink-0 object-contain" />
          {expanded && (
            <div className="leading-none min-w-0">
              <p className="text-sm font-black text-white truncate font-grotesk tracking-tight">JanSetu</p>
              <p className="text-[10px] text-white/35 uppercase tracking-[0.1em] truncate font-grotesk">Delhi Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-0 py-2 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {allItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={expanded ? undefined : item.label}
              className={cn(
                "relative flex h-10 items-center transition-colors group overflow-hidden",
                expanded ? "px-4 gap-3" : "justify-center",
                active
                  ? "border-l-[3px] border-[#E8920A] bg-white/8 text-white"
                  : "border-l-[3px] border-transparent text-white/40 hover:bg-white/5 hover:text-white/70"
              )}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" />

              {expanded && (
                <span className="text-[13px] font-semibold truncate">{item.label}</span>
              )}

              {/* Tooltip when collapsed */}
              {!expanded && (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-none border border-[#163D2A] bg-[#0D2318] px-3 py-1.5 text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity z-50 tracking-wide">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: version + collapse */}
      <div className="shrink-0 border-t border-[#163D2A] py-2">
        {expanded && (
          <div className="px-4 pb-2">
            <p className="text-[10px] text-white/20 uppercase tracking-[0.12em] font-grotesk">v1 · NCT Delhi</p>
          </div>
        )}
        <button
          onClick={toggle}
          title={expanded ? "Collapse" : "Expand"}
          className={cn(
            "flex h-9 w-full items-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors",
            expanded ? "px-4 gap-3" : "justify-center"
          )}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
          {expanded && <span className="text-xs font-bold tracking-wide">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
