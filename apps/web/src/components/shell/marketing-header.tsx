"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Menu, X } from "lucide-react";
import { Button, cn } from "@dcos/ui";
import { useLanguage, type Lang } from "@/lib/i18n";

function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      className="flex h-8 items-center gap-0.5 rounded-lg border border-border bg-card px-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      title="Switch language"
    >
      <span className={cn("rounded px-1 py-0.5 text-xs transition-colors", lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>EN</span>
      <span className={cn("rounded px-1 py-0.5 text-xs transition-colors", lang === "hi" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>हिं</span>
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
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LangToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t("nav.signin")}
            </Button>
          </Link>
          <Link href="/file">
            <Button size="sm">{t("nav.file_btn")}</Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LangToggle />
          <button
            onClick={() => setOpen(!open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
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
              {t(l.key)}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 px-3">
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
