"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@dcos/ui";
import type { NavSection } from "./nav-config";

export function Sidebar({
  sections,
}: {
  sections: NavSection[];
  brandTitle?: string;
  brandSubtitle?: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === pathname || (href !== "/cm" && href !== "/officer" && pathname.startsWith(href));

  const allItems = sections.flatMap((s) => s.items);

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-20 flex-col bg-primary z-50">
      {/* Logo mark */}
      <div className="flex h-14 items-center justify-center border-b border-white/10">
        <span className="flex h-8 w-8 items-center justify-center bg-white text-primary text-xs font-black select-none tracking-tight">
          JS
        </span>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-1 flex-col items-center gap-1 py-4">
        {allItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "relative flex h-11 w-full items-center justify-center transition-colors group",
                active
                  ? "border-l-2 border-white bg-white/10 text-white"
                  : "border-l-2 border-transparent text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 group-hover:opacity-100 lg:block transition-opacity z-50">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 py-4 border-t border-white/10">
        <div
          className="flex h-8 w-8 items-center justify-center rounded bg-white/10 text-white/60 text-[10px] font-bold uppercase tracking-wider"
          title="v0.1"
        >
          v1
        </div>
      </div>
    </aside>
  );
}
