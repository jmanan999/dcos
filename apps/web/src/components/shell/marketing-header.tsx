"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function MarketingHeader() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);

  const LINKS = [
    { href: "/file",         label: t("nav.services") },
    { href: "/track",        label: t("nav.tracking") },
    { href: "/transparency", label: t("nav.transparency") },
  ];

  return (
    <nav className="fixed top-0 w-full h-[56px] bg-surface border-b border-outline-variant z-50 flex items-center justify-between px-margin-desktop">
      {/* Left: wordmark + nav */}
      <div className="flex items-center gap-gutter">
        <Link href="/">
          <span className="text-headline-lg font-bold text-on-surface tracking-tight">
            JanSetu Delhi
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 ml-12">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname.startsWith(l.href)
                  ? "text-label-caps text-primary border-b-2 border-primary py-1"
                  : "text-label-caps text-on-surface-variant hover:text-primary transition-colors py-1"
              }
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right: language + sign in */}
      <div className="hidden md:flex items-center gap-4">
        <button
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          className="text-label-caps text-on-surface-variant hover:text-primary transition-colors"
        >
          {lang === "en" ? "हिंदी" : "English"}
        </button>
        <Link href="/login">
          <button className="bg-primary text-white px-6 py-2 text-label-caps rounded-none hover:bg-primary-container transition-all">
            Sign In
          </button>
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden text-on-surface-variant hover:text-on-surface"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute top-[56px] left-0 w-full bg-surface border-b border-outline-variant py-4 px-margin-mobile md:hidden z-50">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-label-caps text-on-surface-variant hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            <button className="mt-3 w-full bg-primary text-white py-3 text-label-caps">
              Sign In
            </button>
          </Link>
        </div>
      )}
    </nav>
  );
}
