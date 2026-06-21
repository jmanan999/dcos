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
      className="label-caps text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
      title="Switch language"
    >
      {lang === "en" ? "हिं" : "EN"}
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
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="container flex h-14 items-center justify-between">
        {/* Text wordmark — no icon */}
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-base font-bold tracking-tight text-foreground">JanSetu Delhi</span>
        </Link>

        {/* Desktop nav — label-caps style */}
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "label-caps transition-colors border-b-2 py-1",
                pathname.startsWith(l.href)
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
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
              className="block px-3 py-2.5 label-caps text-foreground hover:bg-muted"
            >
              {t(l.key)}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 px-3 pb-2">
            <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">{t("nav.signin")}</Button>
            </Link>
            <Link href="/file" className="flex-1" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full">{t("nav.file_btn")}</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
