"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { cn } from "@dcos/ui";
import type { NavSection } from "./nav-config";

export function Sidebar({
  sections,
  brandTitle,
  brandSubtitle,
}: {
  sections: NavSection[];
  brandTitle: string;
  brandSubtitle: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === pathname || (href !== "/cm" && href !== "/officer" && pathname.startsWith(href));

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-white">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">{brandTitle}</p>
          <p className="text-2xs font-medium uppercase tracking-wider text-sidebar-muted">
            {brandSubtitle}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-sidebar-muted">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent/15 text-white"
                          : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          active ? "text-sidebar-accent" : "text-sidebar-muted"
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-2xs text-sidebar-muted">JanSetu — Delhi Grievance Portal</p>
        <p className="text-2xs text-sidebar-muted/70">v0.1 · Govt. of NCT of Delhi</p>
      </div>
    </aside>
  );
}
