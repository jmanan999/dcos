"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spinner } from "@dcos/ui";
import { useAuth } from "@/lib/auth/provider";
import { isCommandRole, isDeptRole, isOfficerRole, type Role } from "@/lib/auth/types";

/**
 * Client-side route protection (works with both Supabase and the local-JWT dev
 * fallback, where the token lives in localStorage). Redirects unauthenticated or
 * mis-roled users to /login.
 */
export function RouteGuard({
  children,
  require,
}: {
  children: React.ReactNode;
  require: "officer" | "dept" | "command";
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const role = user?.role as Role | undefined;
  const allowed =
    !!role &&
    (require === "officer"
      ? isOfficerRole(role) || isCommandRole(role)
      : require === "dept"
        ? isDeptRole(role)
        : isCommandRole(role));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (!allowed) {
      router.replace("/login");
    }
  }, [loading, user, allowed, router, pathname]);

  if (loading || !user || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-7 w-7 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
