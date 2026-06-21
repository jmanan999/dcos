"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button, cn } from "@dcos/ui";
import { useLanguage } from "@/lib/i18n";

function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      className="flex h-8 items-center gap-0.5 rounded border border-border bg-card px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      title="Switch language"
    >
      <span
        className={cn(
          "rounded px-1 py-0.5 transition-colors",
          lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}
      >
        EN
      </span>
      <span
        className={cn(
          "rounded px-1 py-0.5 transition-colors",
          lang === "hi" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}
      >
        हिं
      </span>
    </button>
  );
}

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const LINKS = [
    { href: "/file", key: "nav.file" as const },
    { href: "/track", key: "nav.track" as const },
    { href: "/transparency", key: "nav.transparency" as const },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo — typographic, no icon badge */}
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center bg-primary text-primary-foreground text-xs font-bold select-none">
            JS
          </span>
          <div className="leading-none">
            <p className="text-sm font-bold tracking-tight text-foreground">JanSetu</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Delhi · Grievance Portal
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-3 py-2 text-sm transition-colors",
                pathname.startsWith(l.href)
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LangToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-sm">
              {t("nav.signin")}
            </Button>
          </Link>
          <Link href="/file">
            <Button size="sm" className="text-sm">
              {t("nav.file_btn")}
            </Button>
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <LangToggle />
          <button
            onClick={() => setOpen(!open)}
            className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-2 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded px-3 py-2.5 text-sm text-foreground hover:bg-muted"
            >
              {t(l.key)}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 px-3 pb-2">
            <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                {t("nav.signin")}
              </Button>
            </Link>
            <Link href="/file" className="flex-1" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full">
                {t("nav.file_btn")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
