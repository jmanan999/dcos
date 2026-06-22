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
    { href: "/wards",        label: "Wards" },
  ];

  return (
    <nav className="fixed top-0 w-full h-[60px] bg-[#F8FAF9] border-b-2 border-[#1A6645] z-50 flex items-center justify-between px-16">
      {/* Left: wordmark */}
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="JanSetu" className="h-9 w-9 object-contain" />
          <span className="text-[18px] font-black text-[#0F2B1F] tracking-tight font-grotesk leading-none">
            JanSetu
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname.startsWith(l.href)
                  ? "label-caps text-[#0F2B1F] border-b-2 border-[#E8920A] pb-0.5"
                  : "label-caps text-[#4D7A63] hover:text-[#0F2B1F] transition-colors pb-0.5"
              }
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right: language + sign in */}
      <div className="hidden md:flex items-center gap-3">
        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          className="label-caps text-[#4D7A63] hover:text-[#0F2B1F] transition-colors border border-[#C8E0D4] px-3 py-1.5 hover:border-[#1A6645]"
        >
          {lang === "en" ? "हिंदी" : "English"}
        </button>

        <Link href="/login">
          <button className="bg-[#080808] text-white px-6 py-2.5 label-caps hover:bg-[#E8920A] transition-colors rounded-none">
            Sign In
          </button>
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden text-[#0F2B1F]"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute top-[60px] left-0 w-full bg-[#080808] border-b-2 border-[#E8920A] py-4 px-6 md:hidden z-50">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 label-caps text-white/60 hover:text-white border-b border-white/10 last:border-0"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10">
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="label-caps text-white/50 hover:text-white"
            >
              {lang === "en" ? "हिंदी" : "English"}
            </button>
            <Link href="/login" onClick={() => setOpen(false)} className="ml-auto">
              <button className="bg-[#E8920A] text-[#0F2B1F] px-5 py-2 label-caps font-black">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
