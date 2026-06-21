"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import type { NavSection } from "./nav-config";

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
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar sections={sections} brandTitle={brandTitle} brandSubtitle={brandSubtitle} />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-20">
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
