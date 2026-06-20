"use client";

import { AppShell } from "@/components/shell/app-shell";
import { RouteGuard } from "@/components/route-guard";
import { CM_NAV } from "@/components/shell/nav-config";

export default function CMLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard require="command">
      <AppShell sections={CM_NAV} brandTitle="JanSetu" brandSubtitle="Command Center">
        {children}
      </AppShell>
    </RouteGuard>
  );
}
