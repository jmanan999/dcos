"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut, Search, ChevronDown } from "lucide-react";
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-5 backdrop-blur">
      {leading}
      {title && <h2 className="hidden text-sm font-semibold text-foreground md:block">{title}</h2>}

      {/* Search */}
      <div className="relative ml-auto hidden w-full max-w-xs sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search grievances, wards…"
          className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>

      {/* Notifications */}
      <button
        className="relative ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:ml-0"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
      </button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar name={user?.name ?? "User"} size="sm" />
          <div className="hidden text-left leading-tight md:block">
            <p className="text-sm font-medium text-foreground">{user?.name ?? "User"}</p>
            <p className="text-2xs text-muted-foreground">
              {user ? ROLE_LABELS[user.role] : "—"}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
    </header>
  );
}
