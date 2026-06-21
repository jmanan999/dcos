"use client";

import { AppShell } from "@/components/shell/app-shell";
import { RouteGuard } from "@/components/route-guard";
import { DEPT_NAV } from "@/components/shell/nav-config";

export default function DeptLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard require="dept">
      <AppShell sections={DEPT_NAV} brandTitle="JanSetu" brandSubtitle="Department Workbench">
        {children}
      </AppShell>
    </RouteGuard>
  );
}
