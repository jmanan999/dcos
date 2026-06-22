"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@dcos/ui";
import type { NavSection } from "./nav-config";

export function MobileNav({ sections, brandTitle }: { sections: NavSection[]; brandTitle: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden rounded-none border border-transparent hover:border-border"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#080808]/70"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-72 bg-[#080808] border-r border-[#1f1f1f] animate-fade-in flex flex-col">
            {/* Brand */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-icon.png" alt="JanSetu" className="h-8 w-8 object-contain" />
                <span className="text-sm font-black text-white font-grotesk tracking-tight">{brandTitle}</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-3">
              {sections.flatMap((s) => s.items).map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/cm" && item.href !== "/officer" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 text-sm font-semibold border-l-[3px] transition-colors",
                      active
                        ? "border-[#E8920A] bg-white/8 text-white"
                        : "border-transparent text-white/40 hover:bg-white/5 hover:text-white/80"
                    )}
                  >
                    <Icon className="h-[17px] w-[17px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-5 pb-5 border-t border-[#1f1f1f] pt-3">
              <p className="text-[10px] text-white/20 uppercase tracking-[0.12em] font-grotesk">v1 · NCT Delhi</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
