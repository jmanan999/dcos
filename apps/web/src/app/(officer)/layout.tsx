"use client";

import { AppShell } from "@/components/shell/app-shell";
import { RouteGuard } from "@/components/route-guard";
import { OFFICER_NAV } from "@/components/shell/nav-config";

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard require="officer">
      <AppShell sections={OFFICER_NAV} brandTitle="JanSetu" brandSubtitle="Officer Console">
        {children}
      </AppShell>
    </RouteGuard>
  );
}
