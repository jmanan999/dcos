"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

export function Footer() {
  const { t } = useLanguage();

  const COLS = [
    {
      title: t("footer.quick_links"),
      links: [
        { href: "/file",         label: t("footer.services_dir") },
        { href: "/track",        label: t("footer.tracking_portal") },
        { href: "/transparency", label: t("footer.transparency_lab") },
        { href: "/login",        label: t("footer.official_access") },
      ],
    },
    {
      title: t("footer.legals"),
      links: [
        { href: "/privacy", label: t("footer.privacy") },
        { href: "/privacy", label: t("footer.terms") },
        { href: "/privacy", label: t("footer.compliance") },
        { href: "/privacy", label: t("footer.accessibility") },
      ],
    },
    {
      title: t("footer.contact"),
      links: [],
      info: [
        "Support: 1800-DELHI-JS",
        "info@jansetu.delhi.gov.in",
        "Secretariat, New Delhi",
      ],
    },
  ];

  return (
    <footer className="bg-[#0D2318] border-t-2 border-[#163D2A] py-14">
      <div className="max-w-[1280px] mx-auto px-16">
        <div className="grid gap-10 md:grid-cols-4 pb-10 border-b border-[#163D2A]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-7 w-7 items-center justify-center bg-[#E8920A] text-[#0F2B1F] text-[10px] font-black font-grotesk">
                JS
              </span>
              <p className="text-sm font-black text-white font-grotesk tracking-tight">JanSetu Delhi</p>
            </div>
            <p className="label-caps text-white/30 mb-3">{t("footer.description")}</p>
            <p className="text-xs leading-relaxed text-white/35">{t("footer.brand_desc")}</p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="label-caps text-white/40 mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/50 transition-colors hover:text-[#E8920A]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                {col.info?.map((line) => (
                  <li key={line} className="text-sm text-white/40">{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-2 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <p className="text-xs text-white/20 font-grotesk tracking-wide">
            DPDP Act 2023 Compliant · Built in India
          </p>
        </div>
      </div>
    </footer>
  );
}
