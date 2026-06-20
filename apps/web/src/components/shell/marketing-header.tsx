"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Menu, X } from "lucide-react";
import { Button, cn } from "@dcos/ui";

const LINKS = [
  { href: "/file", label: "File a Complaint" },
  { href: "/track", label: "Track Status" },
  { href: "/transparency", label: "Transparency" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">DCOS Delhi</p>
            <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
              Citizen Operating System
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(l.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/file">
            <Button size="sm">File Complaint</Button>
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 px-3">
            <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                Sign in
              </Button>
            </Link>
            <Link href="/file" className="flex-1" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full">
                File
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
