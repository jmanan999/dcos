"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut, ChevronDown } from "lucide-react";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dcos/ui";
import { useAuth } from "@/lib/auth/provider";
import { ROLE_LABELS } from "@/lib/auth/types";

export function Topbar({ title, leading }: { title?: string; leading?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card px-6">
      {leading}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        {title && (
          <>
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className="text-muted-foreground">/</span>
          </>
        )}
        <span className="label-caps text-muted-foreground">Delhi Grievance Portal</span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* System status */}
        <div className="hidden items-center gap-2 border border-border bg-background px-3 py-1.5 sm:flex">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="label-caps text-muted-foreground">System Online</span>
        </div>

        {/* Notifications */}
        <button
          className="relative flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded p-1 pr-2 transition-colors hover:bg-muted focus:outline-none">
            <Avatar name={user?.name ?? "User"} size="sm" />
            <div className="hidden text-left leading-tight md:block">
              <p className="text-sm font-medium text-foreground">{user?.name ?? "User"}</p>
              <p className="label-caps text-muted-foreground">
                {user ? ROLE_LABELS[user.role] : "—"}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user?.email ?? user?.phone ?? user?.name ?? "Signed in"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
